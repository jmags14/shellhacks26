import os
from pathlib import Path

import psycopg
from dotenv import load_dotenv

# shellhack26/
BASE_DIR = Path(__file__).resolve().parent.parent

# shellhack26/.env
ENV_PATH = BASE_DIR / ".env"

#print("Looking for .env at:", ENV_PATH)
#print(".env exists:", ENV_PATH.exists())
load_dotenv(ENV_PATH)

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL was not found in .env")

try:
    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cursor:
            cursor.execute("SELECT version();")
            version = cursor.fetchone()

            print("SUCCESS: Connected to Tiger Data!")
            print("PostgreSQL version:")
            print(version[0])

except Exception as error:
    print("FAILED to connect to Tiger Data")
    print(error)