from google import genai
from dotenv import load_dotenv
import os
import json

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def verify_recipe(caption: str, extracted: dict, video_path: str = None):
    prompt = f"""
You are checking a recipe extraction for accuracy against its source (caption AND video).

Source caption:
{caption}

Extracted recipe (JSON):
{json.dumps(extracted)}

Check every ingredient and step against BOTH the caption text and the video content
(the creator may have spoken steps or shown ingredients that aren't in the caption).
Only flag something if it's NOT supported by the caption OR the video.

Return ONLY valid JSON with this exact shape, no other text:

{{
  "flags": [
    {{"field": "string describing what's flagged", "reason": "string"}}
  ],
  "verified": true or false
}}

If nothing is questionable, return "flags": [] and "verified": true.
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