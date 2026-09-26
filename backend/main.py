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

    return {
        "success": True,
        "video_path": output_path,
        "caption": caption,
        "extracted_recipe": extracted
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