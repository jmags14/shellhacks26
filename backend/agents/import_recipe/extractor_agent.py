from google import genai
from dotenv import load_dotenv
import os
import json

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def extract_recipe(caption: str, video_path: str = None):
    prompt = f"""
Extract a structured recipe from this Instagram post.
Use BOTH the caption text AND the video itself (the creator may speak steps
that aren't written in the caption, or vice versa). Combine both sources
into one complete, accurate recipe.

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

Only include quantity/unit if clearly stated (written or spoken). Never guess a number that wasn't given.

Caption:
{caption}
"""

    contents = [prompt]

    if video_path:
        video_file = client.files.upload(file=video_path)
        contents.append(video_file)

    response = client.models.generate_content(
        model="gemini-3.5-flash-lite",
        contents=contents
    )

    text = response.text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]

    return json.loads(text.strip())