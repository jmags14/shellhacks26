from google import genai
from dotenv import load_dotenv
import os
import json

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

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