from google import genai
from dotenv import load_dotenv
import os
import json

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def estimate_recipe_price(ingredients: list):
    ingredient_lines = "\n".join(
        f"- {ing.get('quantity', '')} {ing.get('unit', '')} {ing['name']}"
        for ing in ingredients
    )

    prompt = f"""
Estimate the approximate US grocery cost to buy the ingredients below,
based on typical prices at common US grocery stores (Walmart, Publix, etc.)
in 2026. Assume the person needs to BUY whole packages/units (e.g. a whole
bag of rice, a whole bottle of soy sauce), not just the amount used in the
recipe, since that's what it actually costs to acquire.

Ingredients:
{ingredient_lines}

Return ONLY valid JSON with this exact shape, no other text:

{{
  "estimated_total": number,
  "currency": "USD",
  "note": "This is an AI-generated estimate, not a live price.",
  "line_items": [
    {{"ingredient": "string", "estimated_price": number}}
  ]
}}
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