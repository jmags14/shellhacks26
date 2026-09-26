from collections import Counter
from uuid import UUID

from database.db import get_db_connection
from services.recipe_service import get_recipes_by_ids


FAMILIAR_LIMIT = 3
DISCOVERY_LIMIT = 2


def get_group_candidates(user_ids: list[UUID]):
    if not user_ids:
        return []

    conn = get_db_connection()

    try:
        with conn.cursor() as cursor:

            # -------------------------------------------------
            # 1. Get group behavior
            # -------------------------------------------------

            cursor.execute(
                """
                SELECT user_id, recipe_id
                FROM saved_recipes
                WHERE user_id = ANY(%s);
                """,
                (user_ids,),
            )
            saved_rows = cursor.fetchall()

            cursor.execute(
                """
                SELECT user_id, recipe_id, rating
                FROM recipe_history
                WHERE user_id = ANY(%s);
                """,
                (user_ids,),
            )
            history_rows = cursor.fetchall()


            # -------------------------------------------------
            # 2. Pick familiar candidates
            # -------------------------------------------------

            familiar_scores = Counter()

            for _, recipe_id in saved_rows:
                familiar_scores[recipe_id] += 2

            for _, recipe_id, rating in history_rows:
                familiar_scores[recipe_id] += 2

                if rating is not None:
                    if rating >= 4:
                        familiar_scores[recipe_id] += 2
                    elif rating <= 2:
                        familiar_scores[recipe_id] -= 2


            familiar_ids = [
                recipe_id
                for recipe_id, _
                in familiar_scores.most_common(FAMILIAR_LIMIT)
            ]


            # -------------------------------------------------
            # 3. Find every recipe already known by the group
            # -------------------------------------------------

            known_recipe_ids = set()

            for _, recipe_id in saved_rows:
                known_recipe_ids.add(recipe_id)

            for _, recipe_id, _ in history_rows:
                known_recipe_ids.add(recipe_id)


            # -------------------------------------------------
            # 4. Find positive recipes to represent group taste
            #
            # Saved recipe = positive interest
            # Cooked + rating >= 4 = strong positive
            # -------------------------------------------------

            positive_recipe_ids = set()

            for _, recipe_id in saved_rows:
                positive_recipe_ids.add(recipe_id)

            for _, recipe_id, rating in history_rows:
                if rating is not None and rating >= 4:
                    positive_recipe_ids.add(recipe_id)


            # -------------------------------------------------
            # 5. Create temporary GROUP taste vector
            #
            # AVG() combines positive recipe embeddings.
            # We DO NOT save this vector.
            # -------------------------------------------------

            discovery_ids = []

            if positive_recipe_ids:

                cursor.execute(
                    """
                    SELECT AVG(embedding)
                    FROM recipe_embeddings
                    WHERE recipe_id = ANY(%s);
                    """,
                    (list(positive_recipe_ids),),
                )

                row = cursor.fetchone()
                group_embedding = row[0] if row else None


                # -------------------------------------------------
                # 6. Find unseen recipes closest to group taste
                # -------------------------------------------------

                if group_embedding is not None:

                    if known_recipe_ids:

                        cursor.execute(
                            """
                            SELECT re.recipe_id
                            FROM recipe_embeddings re
                            WHERE NOT (re.recipe_id = ANY(%s))
                            ORDER BY re.embedding <=> %s::vector
                            LIMIT %s;
                            """,
                            (
                                list(known_recipe_ids),
                                group_embedding,
                                DISCOVERY_LIMIT,
                            ),
                        )

                    else:

                        cursor.execute(
                            """
                            SELECT re.recipe_id
                            FROM recipe_embeddings re
                            ORDER BY re.embedding <=> %s::vector
                            LIMIT %s;
                            """,
                            (
                                group_embedding,
                                DISCOVERY_LIMIT,
                            ),
                        )

                    discovery_ids = [
                        row[0]
                        for row in cursor.fetchall()
                    ]


            # -------------------------------------------------
            # 7. Fallback
            #
            # If there wasn't enough behavior/embedding data,
            # still return discovery recipes.
            # -------------------------------------------------

            if len(discovery_ids) < DISCOVERY_LIMIT:

                needed = DISCOVERY_LIMIT - len(discovery_ids)

                excluded_ids = (
                    known_recipe_ids
                    | set(discovery_ids)
                )

                if excluded_ids:

                    cursor.execute(
                        """
                        SELECT id
                        FROM recipes
                        WHERE NOT (id = ANY(%s))
                        ORDER BY created_at DESC
                        LIMIT %s;
                        """,
                        (
                            list(excluded_ids),
                            needed,
                        ),
                    )

                else:

                    cursor.execute(
                        """
                        SELECT id
                        FROM recipes
                        ORDER BY created_at DESC
                        LIMIT %s;
                        """,
                        (needed,),
                    )

                discovery_ids.extend(
                    row[0]
                    for row in cursor.fetchall()
                )

    finally:
        conn.close()


    # -------------------------------------------------
    # 8. Return full recipe objects
    # -------------------------------------------------

    candidate_ids = familiar_ids + discovery_ids

    return get_recipes_by_ids(candidate_ids)