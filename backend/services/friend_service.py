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


def list_friend_suggestions(user_id: str) -> list[dict]:
    """
    Users the given user has no friendship row with (in either direction).
    """

    conn = get_db_connection()

    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT u.id, u.username
                FROM users u
                WHERE u.id <> %s
                  AND NOT EXISTS (
                      SELECT 1
                      FROM friendships f
                      WHERE (f.user_id = %s AND f.friend_id = u.id)
                         OR (f.user_id = u.id AND f.friend_id = %s)
                  )
                ORDER BY u.username;
                """,
                (user_id, user_id, user_id),
            )

            return [
                {"id": str(uid), "username": username}
                for uid, username in cursor.fetchall()
            ]

    finally:
        conn.close()


def add_friend(user_id: str, friend_id: str) -> dict:
    """
    Create an accepted friendship. No-op if one already exists in either direction.
    """

    if user_id == friend_id:
        return {"success": False, "error": "You can't add yourself"}

    conn = get_db_connection()

    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT 1 FROM users WHERE id = %s;", (friend_id,))

            if cursor.fetchone() is None:
                return {"success": False, "error": "User not found"}

            cursor.execute(
                """
                SELECT 1
                FROM friendships
                WHERE (user_id = %s AND friend_id = %s)
                   OR (user_id = %s AND friend_id = %s);
                """,
                (user_id, friend_id, friend_id, user_id),
            )

            if cursor.fetchone() is None:
                cursor.execute(
                    """
                    INSERT INTO friendships (user_id, friend_id, status)
                    VALUES (%s, %s, 'accepted');
                    """,
                    (user_id, friend_id),
                )

        conn.commit()
        return {"success": True}

    except Exception:
        conn.rollback()
        raise

    finally:
        conn.close()
