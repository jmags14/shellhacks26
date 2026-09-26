import os
from pathlib import Path

import psycopg
from dotenv import load_dotenv

# shellhack26/
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# shellhack26/.env
ENV_PATH = BASE_DIR / ".env"

#print("Looking for .env at:", ENV_PATH)
#print(".env exists:", ENV_PATH.exists())
load_dotenv(ENV_PATH)

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL was not found in .env")


# Find schema.sql
BASE_DIR = Path(__file__).resolve().parent.parent
SCHEMA_FILE = BASE_DIR / "database" / "schema.sql"


def create_tables():
    # Read our SQL schema
    schema_sql = SCHEMA_FILE.read_text(encoding="utf-8")

    # Connect to Tiger Data
    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cursor:

            # Run schema.sql
            cursor.execute(schema_sql)

        # Save changes
        conn.commit()

    print("SUCCESS: KitchenOS tables created!")


if __name__ == "__main__":
    create_tables()