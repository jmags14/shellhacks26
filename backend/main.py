from fastapi import FastAPI
from pydantic import BaseModel
import subprocess
import os
import uuid
import json

from agents.import_recipe.extractor_agent import extract_recipe
from agents.import_recipe.verifier_agent import verify_recipe
from agents.import_recipe.save_service import save_recipe, get_recipe


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

    extracted = extract_recipe(caption, output_path)
    verification = verify_recipe(caption, extracted, output_path)
    recipe_id = save_recipe(extracted, request.url)

    return {
        "success": True,
        "video_path": output_path,
        "caption": caption,
        "extracted_recipe": extracted,
        "verification": verification,
        "recipe_id": recipe_id
    }

@app.get("/recipes/{recipe_id}")
def get_recipe_route(recipe_id: str):
    recipe = get_recipe(recipe_id)
    if recipe is None:
        return {"success": False, "error": "Recipe not found"}
    return {"success": True, "recipe": recipe}