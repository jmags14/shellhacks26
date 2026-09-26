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
that aren't written in the caption, or vice versa, or may say nothing at all
if the video only has music). Combine both sources into one complete,
accurate recipe.

Pay close attention to ingredients shown visually in the video (on a cutting
board, in bowls, in packaging) even if not verbally mentioned — extract every
ingredient you can see being used, not just ones spoken aloud or written in
the caption.

For quantities and units:
- If an amount is clearly STATED (written or spoken), use it exactly and set "estimated": false.
- If no amount is stated but you can visually judge a reasonable approximate amount
  (e.g. portion size, container fill level, count of whole items like onions or chicken breasts),
  provide your best estimate and set "estimated": true.
- Only leave quantity/unit as null if there is truly no way to approximate it (e.g. a
  spice shaken briefly with no visible amount).

Return ONLY valid JSON with this exact shape, no other text:

{{
  "title": "string",
  "description": "string or null (a short 1-2 sentence summary of the dish)",
  "cuisine": "string or null (e.g. Italian, Mexican, Indian)",
  "servings": number or null,
  "prep_time_minutes": number or null,
  "cook_time_minutes": number or null,
  "ingredients": [
    {{
      "name": "string (just the ingredient name, no quantity/unit/prep)",
      "quantity": number or null,
      "unit": "string or null (e.g. tbsp, tsp, cup, lb, oz, g)",
      "preparation": "string or null (e.g. minced, diced, cubed). ONLY append ' (approximate)' if you filled in a quantity/unit that was NOT stated or clearly shown with a number — do not add it if quantity and unit are both null, and do not add it as a generic filler.",
      "optional": true or false
    }}
  ],
  "steps": ["string", ...]
}}

Caption:
{caption}
"""

    contents = [prompt]

    if video_path:
        video_file = client.files.upload(file=video_path)

        import time
        while video_file.state.name == "PROCESSING":
            time.sleep(2)
            video_file = client.files.get(name=video_file.name)

        if video_file.state.name == "FAILED":
            raise ValueError("Video processing failed")

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