from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import subprocess
import sys
import os
import uuid
from uuid import UUID
import json
from agents.cook_together.workflow import run_cook_together
from agents.import_recipe.extractor_agent import extract_recipe
from agents.import_recipe.verifier_agent import verify_recipe
from agents.import_recipe.save_service import save_recipe, get_recipe, delete_recipe
from services.embedding_service import embed_recipe
from agents.import_recipe.price_agent import estimate_recipe_price
from services.recipe_service import list_recipes_for_user
from services.friend_service import list_friends
from agents.import_recipe.narration_agent import narrate_recipe, narrate_step

app = FastAPI()

# Cook Together runs with mock agents (0 Gemini requests) unless the root .env
# sets USE_MOCK_AGENTS=false. Flip that one line to turn the real agents on.
USE_MOCK_AGENTS = os.getenv("USE_MOCK_AGENTS", "true").strip().lower() != "false"

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
    try:
        planner, personal_outputs, candidates = await run_cook_together(
            user_ids=request.user_ids,
            intent=request.intent,
            use_mock_agents=USE_MOCK_AGENTS,
        )
    except ValueError as e:
        # e.g. a user that isn't in the users table, or no candidate recipes
        raise HTTPException(status_code=400, detail=str(e))

    titles = {c.recipe_id: c.title for c in candidates}

    return {
        "mock": USE_MOCK_AGENTS,
        "top_pick": planner.top_pick,
        "conflicts_resolved": planner.conflicts_resolved,
        "ranking": [
            {**r.model_dump(), "title": titles.get(r.recipe_id, "Unknown recipe")}
            for r in planner.ranking
        ],
        "agents": [p.model_dump() for p in personal_outputs],
    }

def run_import(url: str, user_id: str) -> dict:
    os.makedirs("downloads", exist_ok=True)

    video_id = str(uuid.uuid4())
    output_path = f"downloads/{video_id}.mp4"

    download_result = subprocess.run(
        [sys.executable, "-m", "yt_dlp", "-o", output_path, url],
        capture_output=True,
        text=True
    )

    if download_result.returncode != 0:
        return {
            "success": False,
            "error": download_result.stderr
        }

    info_result = subprocess.run(
        [sys.executable, "-m", "yt_dlp", "--dump-json", url],
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
        url,
        user_id
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


@app.post("/import")
def import_recipe(request: ImportRequest):
    return run_import(request.url, request.user_id)


# In-memory job table for background imports (lost on server restart).
# job_id -> {"status": "running" | "done" | "error", "recipe_id": str | None, "error": str | None}
IMPORT_JOBS: dict[str, dict] = {}


def _run_import_job(job_id: str, url: str, user_id: str):
    try:
        result = run_import(url, user_id)
    except Exception as e:
        IMPORT_JOBS[job_id] = {"status": "error", "recipe_id": None, "error": str(e)}
        return

    if result.get("success"):
        IMPORT_JOBS[job_id] = {
            "status": "done",
            "recipe_id": result.get("recipe_id"),
            "error": None,
        }
    else:
        IMPORT_JOBS[job_id] = {
            "status": "error",
            "recipe_id": None,
            "error": result.get("error") or "Import failed",
        }


@app.post("/import/start")
def start_import(request: ImportRequest, background_tasks: BackgroundTasks):
    """Kick off an import and return immediately; poll /import/status/{job_id}."""
    job_id = str(uuid.uuid4())
    IMPORT_JOBS[job_id] = {"status": "running", "recipe_id": None, "error": None}
    background_tasks.add_task(_run_import_job, job_id, request.url, request.user_id)
    return {"success": True, "job_id": job_id}


@app.get("/import/status/{job_id}")
def import_status(job_id: str):
    job = IMPORT_JOBS.get(job_id)

    if job is None:
        return {"success": False, "status": "error", "error": "Unknown import job"}

    return {"success": True, **job}


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

@app.delete("/recipes/{recipe_id}")
def delete_recipe_route(recipe_id: str, user_id: str):
    return delete_recipe(recipe_id, user_id)

from fastapi.responses import Response

@app.get("/recipes/{recipe_id}/narrate")
def narrate_recipe_route(recipe_id: str, user_id: str, step: int = None):
    recipe = get_recipe(recipe_id, user_id)

    if recipe is None:
        return {"success": False, "error": "Recipe not found"}

    if step is not None:
        if step < 1 or step > len(recipe["steps"]):
            return {"success": False, "error": f"Step must be between 1 and {len(recipe['steps'])}"}
        text = f"Step {step}: {recipe['steps'][step - 1]}"
    else:
        text = f"Let's make {recipe['title']}. " + " ".join(
            f"Step {i}: {s}" for i, s in enumerate(recipe["steps"], start=1)
        )

    audio_bytes = narrate_recipe(recipe["title"], recipe["steps"]) if step is None else narrate_step(text)

    return Response(content=audio_bytes, media_type="audio/mpeg")