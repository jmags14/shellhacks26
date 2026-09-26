from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import subprocess
import os
import uuid
from uuid import UUID
import json
from agents.cook_together.workflow import cook_together
from agents.import_recipe.extractor_agent import extract_recipe
from agents.import_recipe.verifier_agent import verify_recipe
from agents.import_recipe.save_service import save_recipe, get_recipe
from services.embedding_service import embed_recipe
from agents.import_recipe.price_agent import estimate_recipe_price
from services.recipe_service import list_recipes_for_user
from services.friend_service import list_friends

app = FastAPI()

# Allow the Vite dev server (localhost or a LAN IP, e.g. testing on a phone)
# to call the API directly. The Vite proxy in vite.config.ts avoids CORS too.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+):5173",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"status": "ok"}

class CookTogetherRequest(BaseModel):
    user_ids: list[UUID]
    intent: str | None = None

class ImportRequest(BaseModel):
    url: str
    user_id: str


@app.post("/cook-together")
async def create_cook_together(
    request: CookTogetherRequest,
):
    result = await cook_together(
        user_ids=request.user_ids,
        intent=request.intent,

        # ==============================================
        # MOCK MODE — 0 GEMINI REQUESTS
        #
        # FINAL REAL GEMINI VERSION:
        # Change True -> False
        # ==============================================
        use_mock_agents=True,
    )

    return result

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
        return {
            "success": False,
            "error": download_result.stderr
        }

    info_result = subprocess.run(
        ["yt-dlp", "--dump-json", request.url],
        capture_output=True,
        text=True
    )

    if info_result.returncode != 0:
        return {
            "success": False,
            "error": info_result.stderr
        }

    metadata = json.loads(info_result.stdout)
    caption = metadata.get("description", "")

    extracted = extract_recipe(caption, output_path)

    verification = verify_recipe(
        caption,
        extracted,
        output_path
    )

    recipe_id = save_recipe(
        extracted,
        request.url,
        request.user_id
    )

    try:
        embed_recipe(recipe_id)
        embedded = True
    except Exception as e:
        print(f"Embedding failed: {e}")
        embedded = False

    return {
        "success": True,
        "video_path": output_path,
        "caption": caption,
        "extracted_recipe": extracted,
        "verification": verification,
        "recipe_id": recipe_id,
        "embedded": embedded,
    }


@app.get("/friends")
def list_friends_route(user_id: str):
    return {
        "success": True,
        "friends": list_friends(user_id)
    }


@app.get("/recipes")
def list_recipes_route(user_id: str):
    return {
        "success": True,
        "recipes": list_recipes_for_user(user_id)
    }


@app.get("/recipes/{recipe_id}")
def get_recipe_route(recipe_id: str, user_id: str):
    recipe = get_recipe(recipe_id, user_id)

    if recipe is None:
        return {
            "success": False,
            "error": "Recipe not found"
        }

    return {
        "success": True,
        "recipe": recipe
    }

@app.get("/recipes/{recipe_id}/price")
def get_recipe_price(recipe_id: str, user_id: str):
    recipe = get_recipe(recipe_id, user_id)

    if recipe is None:
        return {"success": False, "error": "Recipe not found"}

    price_estimate = estimate_recipe_price(recipe["ingredients"])

    return {"success": True, "price_estimate": price_estimate}