from google import genai

from database.db import get_db_connection


EMBEDDING_MODEL = "gemini-embedding-2"
EMBEDDING_DIMENSIONS = 768

client = genai.Client()


def create_embedding(text: str) -> list[float]:
    """Turn recipe text into a 768-dimensional embedding."""

    response = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=text,
        config={
            "output_dimensionality": EMBEDDING_DIMENSIONS,
        },
    )

    return response.embeddings[0].values


def save_recipe_embedding(
    recipe_id: str,
    embedding_text: str,
    embedding: list[float],
):
    """Save or update a recipe embedding in TigerData."""

    conn = get_db_connection()

    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO recipe_embeddings (
                    recipe_id,
                    embedding,
                    embedding_text,
                    model_name
                )
                VALUES (%s, %s, %s, %s)

                ON CONFLICT (recipe_id)
                DO UPDATE SET
                    embedding = EXCLUDED.embedding,
                    embedding_text = EXCLUDED.embedding_text,
                    model_name = EXCLUDED.model_name,
                    updated_at = NOW();
                """,
                (
                    recipe_id,
                    embedding,
                    embedding_text,
                    EMBEDDING_MODEL,
                ),
            )

        conn.commit()

    finally:
        conn.close()

def build_recipe_embedding_text(recipe_id: str) -> str:
    """
    Fetch a recipe from TigerData and build the text
    that represents it semantically.
    """

    conn = get_db_connection()

    try:
        with conn.cursor() as cursor:

            # Get recipe information
            cursor.execute(
                """
                SELECT
                    title,
                    description,
                    cuisine
                FROM recipes
                WHERE id = %s;
                """,
                (recipe_id,),
            )

            recipe = cursor.fetchone()

            if not recipe:
                raise ValueError(f"Recipe {recipe_id} not found")

            title, description, cuisine = recipe

            # Get ingredient names
            cursor.execute(
                """
                SELECT i.name
                FROM recipe_ingredients ri
                JOIN ingredients i
                    ON i.id = ri.ingredient_id
                WHERE ri.recipe_id = %s
                ORDER BY i.name;
                """,
                (recipe_id,),
            )

            ingredients = [
                row[0]
                for row in cursor.fetchall()
            ]

    finally:
        conn.close()

    # Build semantic representation
    parts = [
        f"Title: {title}",
    ]

    if cuisine:
        parts.append(f"Cuisine: {cuisine}")

    if description:
        parts.append(f"Description: {description}")

    if ingredients:
        parts.append(
            f"Ingredients: {', '.join(ingredients)}"
        )

    return "\n".join(parts)


def embed_recipe(recipe_id: str):
    """
    Complete pipeline:
    recipe -> text -> embedding -> TigerData
    """

    embedding_text = build_recipe_embedding_text(recipe_id)

    embedding = create_embedding(embedding_text)

    if len(embedding) != EMBEDDING_DIMENSIONS:
        raise ValueError(
            f"Expected {EMBEDDING_DIMENSIONS} dimensions, "
            f"got {len(embedding)}"
        )

    save_recipe_embedding(
        recipe_id=recipe_id,
        embedding_text=embedding_text,
        embedding=embedding,
    )

    return embedding

def embed_all_recipes():
    """
    Generate and save embeddings for every recipe in TigerData.

    Existing embeddings are updated because save_recipe_embedding()
    uses ON CONFLICT DO UPDATE.
    """

    conn = get_db_connection()

    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, title
                FROM recipes
                ORDER BY title;
                """
            )

            recipes = cursor.fetchall()

    finally:
        conn.close()

    results = []

    for recipe_id, title in recipes:
        print(f"Embedding: {title}")

        try:
            embedding = embed_recipe(str(recipe_id))

            results.append({
                "recipe_id": str(recipe_id),
                "title": title,
                "success": True,
            })

            print(f"  ✓ {len(embedding)} dimensions")

        except Exception as error:

            results.append({
                "recipe_id": str(recipe_id),
                "title": title,
                "success": False,
                "error": str(error),
            })

            print(f"  ✗ FAILED: {error}")

    return results

def find_similar_recipes(
    recipe_id: str,
    limit: int = 5,
):
    """
    Find recipes whose embeddings are most similar
    to the given recipe.

    Lower cosine distance = more similar.
    """

    conn = get_db_connection()

    try:
        with conn.cursor() as cursor:

            # First get the source recipe's embedding
            cursor.execute(
                """
                SELECT embedding
                FROM recipe_embeddings
                WHERE recipe_id = %s;
                """,
                (recipe_id,),
            )

            row = cursor.fetchone()

            if not row:
                raise ValueError(
                    f"No embedding found for recipe {recipe_id}"
                )

            source_embedding = row[0]

            # Compare it against every OTHER recipe
            cursor.execute(
                """
                SELECT
                    r.id,
                    r.title,
                    1 - (re.embedding <=> %s::vector) AS similarity
                FROM recipe_embeddings re
                JOIN recipes r
                    ON r.id = re.recipe_id
                WHERE re.recipe_id <> %s
                ORDER BY re.embedding <=> %s::vector
                LIMIT %s;
                """,
                (
                    source_embedding,
                    recipe_id,
                    source_embedding,
                    limit,
                ),
            )

            return cursor.fetchall()

    finally:
        conn.close()