from fastapi import FastAPI
from pydantic import BaseModel
import subprocess
import os
import uuid
import json

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

    # Download the video
    download_result = subprocess.run(
        ["yt-dlp", "-o", output_path, request.url],
        capture_output=True,
        text=True
    )

    if download_result.returncode != 0:
        return {"success": False, "error": download_result.stderr}

    # Get the metadata (caption, etc.) as JSON
    info_result = subprocess.run(
        ["yt-dlp", "--dump-json", request.url],
        capture_output=True,
        text=True
    )

    if info_result.returncode != 0:
        return {"success": False, "error": info_result.stderr}

    metadata = json.loads(info_result.stdout)
    caption = metadata.get("description", "")

    return {
        "success": True,
        "video_path": output_path,
        "caption": caption
    }