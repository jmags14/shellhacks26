from fastapi import FastAPI
from pydantic import BaseModel
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

    return {
        "success": True,
        "video_path": output_path,
        "caption": caption,
        "extracted_recipe": extracted,
        "verification": verification
    }

def extract_recipe(caption: str):
    prompt = f"""
Extract a structured recipe from this Instagram caption.
Return ONLY valid JSON with this exact shape, no other text:

{{
  "title": "string",
  "ingredients": ["string", ...],
  "steps": ["string", ...]
}}

Caption:
{caption}
"""

    response = client.models.generate_content(
        model="gemini-3.8-flash",
        contents=prompt
    )

    text = response.text.strip()

    # Remove markdown code fences if Gemini added them
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
        model="gemini-3.8-flash",
        contents=prompt
    )

    text = response.text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]

    return json.loads(text.strip())