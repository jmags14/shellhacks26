from google import genai
from dotenv import load_dotenv
import os
import json

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

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