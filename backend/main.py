from fastapi import FastAPI
from pydantic import BaseModel
import psycopg
import subprocess
import os
import uuid
import json
from google import genai
from dotenv import load_dotenv
import os

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

app = FastAPI()

@app.get("/")
def read_root():
    return {"status": "ok"}

class ImportRequest(BaseModel):
    url: str

@app.post("/import")
def import_recipe(request: ImportRequest):
    os.makedirs("downloads", exist_ok=True)

    video_id = str(uuid.uuid4())
    output_path = f"downloads/{video_id}.mp4"

    download_result = subprocess.run(
        ["yt-dlp", "-o", output_path, request.url],
        capture_output=True,
        text=True
    )

    if download_result.returncode != 0:
        return {"success": False, "error": download_result.stderr}

    info_result = subprocess.run(
        ["yt-dlp", "--dump-json", request.url],
        capture_output=True,
        text=True
    )

    if info_result.returncode != 0:
        return {"success": False, "error": info_result.stderr}

    metadata = json.loads(info_result.stdout)
    caption = metadata.get("description", "")

    extracted = extract_recipe(caption)
    verification = verify_recipe(caption, extracted)
    recipe_id = save_recipe(extracted, request.url)

    return {
        "success": True,
        "video_path": output_path,
        "caption": caption,
        "extracted_recipe": extracted,
        "verification": verification,
        "recipe_id": recipe_id
    }

def extract_recipe(caption: str):
    prompt = f"""
Extract a structured recipe from this Instagram caption.
Return ONLY valid JSON with this exact shape, no other text:

{{
  "title": "string",
  "ingredients": [
    {{
      "name": "string (just the ingredient name, no quantity/unit/prep)",
      "quantity": number or null,
      "unit": "string or null (e.g. tbsp, tsp, cup, lb, oz, g)",
      "preparation": "string or null (e.g. minced, diced, cubed)",
      "optional": true or false
    }}
  ],
  "steps": ["string", ...]
}}

Only include quantity/unit if clearly stated. Never guess a number that wasn't given.

Caption:
{caption}
"""

    response = client.models.generate_content(
        model="gemini-3.5-flash-lite",
        contents=prompt
    )

    text = response.text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]

    return json.loads(text.strip())

def verify_recipe(caption: str, extracted: dict):
    prompt = f"""
You are checking a recipe extraction for accuracy against its source caption.

Source caption:
{caption}

Extracted recipe (JSON):
{json.dumps(extracted)}

Check every ingredient and step against the source caption.
Flag anything that was invented, guessed, or not clearly stated in the caption
(e.g. an amount that wasn't specified, a step that was inferred rather than stated).

Return ONLY valid JSON with this exact shape, no other text:

{{
  "flags": [
    {{"field": "string describing what's flagged", "reason": "string"}}
  ],
  "verified": true or false
}}

If nothing is questionable, return "flags": [] and "verified": true.
"""

    response = client.models.generate_content(
        model="gemini-3.5-flash-lite",
        contents=prompt
    )

    text = response.text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]

    return json.loads(text.strip())

def save_recipe(extracted: dict, source_url: str):
    conn = psycopg.connect(os.getenv("DATABASE_URL"))
    cur = conn.cursor()

    # Insert the recipe itself
    cur.execute(
        """
        INSERT INTO recipes (title, source, source_url)
        VALUES (%s, %s, %s)
        RETURNING id
        """,
        (extracted["title"], "instagram", source_url)
    )
    recipe_id = cur.fetchone()[0]

    # Insert each ingredient (reusing existing ones by name if they exist)
    for ing in extracted["ingredients"]:
        cur.execute(
            """
            INSERT INTO ingredients (name)
            VALUES (%s)
            ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
            RETURNING id
            """,
            (ing["name"],)
        )
        ingredient_id = cur.fetchone()[0]

        cur.execute(
            """
            INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, preparation, optional)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (recipe_id, ingredient_id) DO NOTHING
            """,
            (recipe_id, ingredient_id, ing.get("quantity"), ing.get("unit"), ing.get("preparation"), ing.get("optional", False))
        )

    # Insert each instruction step
    for i, step_text in enumerate(extracted["steps"], start=1):
        cur.execute(
            """
            INSERT INTO recipe_instructions (recipe_id, step_number, instruction)
            VALUES (%s, %s, %s)
            """,
            (recipe_id, i, step_text)
        )

    conn.commit()
    cur.close()
    conn.close()

    return str(recipe_id)