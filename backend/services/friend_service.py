from database.db import get_db_connection


def list_friends(user_id: str) -> list[dict]:
    """
    Accepted friends of a user. A friendship row counts in either direction.
    """

    conn = get_db_connection()

    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    u.id,
                    u.username,
                    p.diet,
                    p.spice_preference,
                    COALESCE(
                        (
                            SELECT array_agg(a.name ORDER BY a.name)
                            FROM user_allergies ua
                            JOIN allergies a ON a.id = ua.allergy_id
                            WHERE ua.user_id = u.id
                        ),
                        '{}'
                    ) AS allergies
                FROM friendships f
                JOIN users u
                    ON u.id = CASE WHEN f.user_id = %s
                                   THEN f.friend_id
                                   ELSE f.user_id END
                LEFT JOIN user_preferences p ON p.user_id = u.id
                WHERE f.status = 'accepted'
                  AND (f.user_id = %s OR f.friend_id = %s)
                ORDER BY u.username;
                """,
                (user_id, user_id, user_id),
            )

            friends = []

            for friend_id, username, diet, spice, allergies in cursor.fetchall():
                taste_parts = [
                    diet,
                    f"{spice} spice" if spice else None,
                    f"allergic to {', '.join(allergies)}" if allergies else None,
                ]

                friends.append(
                    {
                        "id": str(friend_id),
                        "username": username,
                        "taste": " · ".join(p for p in taste_parts if p),
                    }
                )

            return friends

    finally:
        conn.close()
