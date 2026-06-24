import uuid
import io
import time
import os
import base64
import requests
import json
from typing import Optional, Dict, Any, List
from collections import Counter
from datetime import datetime

from dotenv import load_dotenv
load_dotenv()  # Load environment variables from .env file if present

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Request, Query
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from PIL import Image

from core.color_match import ArtkalPalette
from core.quantizer import process_image, _remove_background_flood_fill
from core.exporter import export_png, generate_preview_base64

# Image generation - Volcengine Ark API
ARK_IMAGE_API_URL = os.environ.get(
    "ARK_IMAGE_API_URL",
    "https://ark.cn-beijing.volces.com/api/v3/images/generations",
)
ARK_API_KEY = os.environ.get("ARK_API_KEY", "")
ARK_DEFAULT_MODEL = os.environ.get("ARK_DEFAULT_MODEL", "ep-m-20260403150322-jjxqm")

# Art picture storage directory
ART_PIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pindou_pic")

# Local file-based database
from pindou_task.local_client import (
    get_tasks as _db_get_tasks,
    create_task as _db_create_task,
    get_task as _db_get_task,
    update_task as _db_update_task,
    delete_task as _db_delete_task,
)


app = FastAPI(title="Pindou", description="Bead Pattern Generator", version="1.0.0", docs_url=None, redoc_url=None)

# Static files and templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Global palette instance
palette = ArtkalPalette()

# In-memory session storage
sessions: Dict[str, Dict[str, Any]] = {}


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    """Serve the main page."""
    return templates.TemplateResponse(request, "index.html")


@app.get("/api/palette")
async def get_palette():
    """Return the full Artkal palette data and presets."""
    return {
        'colors': palette.colors,
        'presets': palette.presets,
    }


@app.post("/api/generate")
async def generate_pattern(
    file: UploadFile = File(...),
    mode: str = Form("fixed_grid"),
    grid_width: int = Form(48),
    grid_height: int = Form(48),
    pixel_size: int = Form(8),
    use_dithering: str = Form("false"),
    palette_preset: str = Form("221"),
    max_colors: int = Form(0),
    similarity_threshold: int = Form(0),
    remove_bg: str = Form("false"),
    contrast: float = Form(0.0),
    saturation: float = Form(0.0),
    sharpness: float = Form(0.0),
):
    """Generate a bead pattern from an uploaded image.

    Args:
        file: Image file (JPG, PNG, GIF, WEBP)
        mode: "fixed_grid" or "pixel_size"
        grid_width: Grid width (for fixed_grid mode)
        grid_height: Grid height (for fixed_grid mode)
        pixel_size: Pixel block size (for pixel_size mode)
        use_dithering: Enable Floyd-Steinberg dithering
        palette_preset: Palette preset ("96", "120", "144", "168", "221")
        max_colors: Maximum number of colors (0 = unlimited)
        similarity_threshold: Color merge threshold in Lab distance (0 = disabled)
        remove_bg: Whether to auto-remove background via border flood fill
        contrast: Contrast adjustment (-50 to +50, 0 = auto)
        saturation: Saturation adjustment (-50 to +50, 0 = auto)
        sharpness: Sharpness adjustment (-50 to +50, 0 = auto)
    """
    # Parse booleans from string (FormData sends "true"/"false" as strings)
    dithering_enabled = use_dithering.lower() in ('true', '1', 'yes')
    remove_bg_enabled = remove_bg.lower() in ('true', '1', 'yes')

    # Validate file type
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Please upload an image file")

    # Read and validate file size (20MB limit)
    contents = await file.read()
    if len(contents) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 20MB limit")

    try:
        image = Image.open(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to open image: {str(e)}")

    # Process the image
    try:
        result = process_image(
            image=image,
            palette=palette,
            mode=mode,
            grid_width=grid_width,
            grid_height=grid_height,
            pixel_size=pixel_size,
            use_dithering=dithering_enabled,
            palette_preset=palette_preset,
            max_colors=max_colors,
            similarity_threshold=similarity_threshold,
            remove_bg=remove_bg_enabled,  # Apply background removal based on user choice
            contrast=contrast,
            saturation=saturation,
            sharpness=sharpness,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

    # Generate preview image
    preview_image = generate_preview_base64(result['pixel_matrix'], palette)

    # Create session
    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        'pixel_matrix': result['pixel_matrix'],
        'color_summary': result['color_summary'],
        'grid_size': result['grid_size'],
        'total_beads': result['total_beads'],
        'created_at': time.time(),
    }

    # Clean up old sessions (keep last 50)
    if len(sessions) > 50:
        sorted_keys = sorted(sessions.keys(), key=lambda k: sessions[k].get('created_at', 0))
        for key in sorted_keys[:-50]:
            del sessions[key]

    return {
        'session_id': session_id,
        'grid_size': result['grid_size'],
        'pixel_matrix': result['pixel_matrix'],
        'color_summary': result['color_summary'],
        'total_beads': result['total_beads'],
        'palette_preset': palette_preset,
        'preview_image': preview_image,
        'background_color': result.get('background_color'),
    }


@app.post("/api/export/png")
async def export_pattern_png(data: dict):
    """Export the pattern as a PNG image.

    Expected JSON body:
        pixel_matrix: List[List[str|None]]
        color_data: Dict[str, str]  (code -> hex)
        color_summary: List[Dict]
        cell_size: int (default 20)
        show_grid: bool (default true)
        show_codes_in_cells: bool (default true)
        show_coordinates: bool (default true)
        palette_preset: str (default "221")
        watermark_text: str (default "")
        bottom_left_text: str (default "")
        remove_bg: bool (default true) - Apply background removal during export
    """
    pixel_matrix = data.get('pixel_matrix')
    color_data = data.get('color_data', {})
    color_summary = data.get('color_summary', [])
    cell_size = data.get('cell_size', 20)
    show_grid = data.get('show_grid', True)
    show_codes_in_cells = data.get('show_codes_in_cells', True)
    show_coordinates = data.get('show_coordinates', True)
    palette_preset = data.get('palette_preset', '221')
    watermark_text = data.get('watermark_text', '')
    bottom_left_text = data.get('bottom_left_text', '')
    remove_bg = data.get('remove_bg', True)

    if not pixel_matrix:
        raise HTTPException(status_code=400, detail="pixel_matrix is required")

    # Apply background removal if requested
    if remove_bg:
        pixel_matrix, _ = _remove_background_flood_fill(pixel_matrix)
        # Recalculate color summary after background removal
        color_counter = Counter()
        for row in pixel_matrix:
            for code in row:
                if code is not None:
                    color_counter[code] += 1
        color_summary = []
        for code, count in color_counter.most_common():
            if code in color_data:
                color_summary.append({
                    'code': code,
                    'hex': color_data[code],
                    'count': count,
                })

    try:
        png_bytes = export_png(
            pixel_matrix, color_data, color_summary,
            cell_size, show_grid, show_codes_in_cells,
            show_coordinates, palette_preset, watermark_text, bottom_left_text
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PNG export failed: {str(e)}")

    timestamp = time.strftime("%Y%m%d_%H%M%S")
    filename = f"ciweimian_{timestamp}.png"

    return StreamingResponse(
        io.BytesIO(png_bytes),
        media_type="image/png",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@app.post("/api/update_cell")
async def update_cell(data: dict):
    """Update a single cell in the pattern.

    Expected JSON body:
        session_id: str
        row: int
        col: int
        new_code: str
    """
    session_id = data.get('session_id')
    row = data.get('row')
    col = data.get('col')
    new_code = data.get('new_code')

    if not session_id or session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = sessions[session_id]
    pixel_matrix = session['pixel_matrix']

    if row is None or col is None or row < 0 or col < 0:
        raise HTTPException(status_code=400, detail="Invalid row/col")

    if row >= len(pixel_matrix) or col >= len(pixel_matrix[0]):
        raise HTTPException(status_code=400, detail="Row/col out of range")

    # Verify new_code exists in palette
    if not palette.get_by_code(new_code):
        raise HTTPException(status_code=400, detail=f"Invalid color code: {new_code}")

    # Update
    old_code = pixel_matrix[row][col]
    pixel_matrix[row][col] = new_code

    # Recompute color summary (skip None/transparent cells)
    counter = Counter()
    for r in pixel_matrix:
        for c in r:
            if c is not None:
                counter[c] += 1

    color_summary = []
    for code, count in counter.most_common():
        color_info = palette.get_by_code(code)
        if color_info:
            color_summary.append({
                'code': color_info['code'],
                'name': color_info['name'],
                'name_zh': color_info['name_zh'],
                'hex': color_info['hex'],
                'count': count,
            })

    session['color_summary'] = color_summary
    session['total_beads'] = sum(c['count'] for c in color_summary)

    return {
        'success': True,
        'old_code': old_code,
        'new_code': new_code,
        'color_summary': color_summary,
        'total_beads': session['total_beads'],
    }


@app.post("/api/generate-image")
async def generate_image(
    prompt: str = Form(...),
    reference_image: Optional[UploadFile] = File(None),
    model: str = Form(ARK_DEFAULT_MODEL),
):
    """Generate an image using Volcengine Ark Image API.

    Args:
        prompt: Text description for image generation (required)
        reference_image: Optional reference image for image-to-image generation
        model: Model endpoint ID (default: ARK_DEFAULT_MODEL)

    Returns:
        JSON with image_url of the generated image
    """
    if not ARK_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Image generation is not configured. Please set the ARK_API_KEY environment variable.",
        )

    try:
        payload = {
            "model": model,
            "prompt": prompt,
            "size": "2048x2048",
            "response_format": "url",
            "watermark": False,
        }

        # If reference image is provided, pass it via the `image` field for img2img.
        # NOTE: Ark's images/generations expects the reference image under `image`
        # (URL or base64 data URL). It silently ignores unknown fields, so the
        # previous `response_image` key was accepted but never applied.
        if reference_image and reference_image.content_type:
            ref_content = await reference_image.read()
            ref_b64 = base64.b64encode(ref_content).decode('utf-8')
            mime = reference_image.content_type or "image/png"
            payload["image"] = f"data:{mime};base64,{ref_b64}"

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {ARK_API_KEY}",
        }

        resp = requests.post(ARK_IMAGE_API_URL, json=payload, headers=headers, timeout=120)
        resp_data = resp.json()

        if resp.status_code != 200:
            raise HTTPException(status_code=500, detail=f"Ark API error: {resp_data}")

        # Extract image URL from response
        image_url = None
        data_list = resp_data.get("data", [])
        if data_list and isinstance(data_list, list):
            image_url = data_list[0].get("url") or data_list[0].get("b64_json")

        if not image_url:
            raise HTTPException(status_code=500, detail=f"No image in response: {resp_data}")

        # Save generated image locally
        local_filename = None
        try:
            img_resp = requests.get(image_url, timeout=60)
            if img_resp.status_code == 200:
                timestamp = time.strftime("%Y%m%d_%H%M%S")
                local_filename = f"art_{timestamp}.png"
                save_path = os.path.join(ART_PIC_DIR, local_filename)
                with open(save_path, "wb") as f:
                    f.write(img_resp.content)
                # Save metadata
                meta_path = os.path.join(ART_PIC_DIR, local_filename + ".json")
                with open(meta_path, "w", encoding="utf-8") as f:
                    json.dump({
                        "filename": local_filename,
                        "prompt": prompt,
                        "model": model,
                        "created_at": datetime.utcnow().isoformat(),
                    }, f, ensure_ascii=False)
        except Exception:
            pass  # Don't fail generation if saving fails

        return {
            "success": True,
            "image_url": image_url,
            "local_filename": local_filename,
            "prompt": prompt,
            "model": model,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image generation failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 5000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
    )


# ==================== 拼豆盘任务管理 API ====================

@app.get("/api/tasks")
async def get_tasks(
    status: Optional[str] = Query(None, description="Filter by status"),
    search: Optional[str] = Query(None, description="Search by name"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """获取任务列表"""
    try:
        return _db_get_tasks(status=status, search=search, limit=limit, offset=offset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get tasks: {str(e)}")


@app.post("/api/tasks")
async def create_task(data: dict):
    """创建新任务"""
    try:
        return _db_create_task(data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create task: {str(e)}")


@app.get("/api/tasks/{task_id}")
async def get_task(task_id: int):
    """获取单个任务详情"""
    try:
        task = _db_get_task(task_id)
        if task is None:
            raise HTTPException(status_code=404, detail="Task not found")
        return {"success": True, "task": task}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get task: {str(e)}")


@app.put("/api/tasks/{task_id}")
async def update_task(task_id: int, data: dict):
    """更新任务"""
    try:
        task = _db_update_task(task_id, data)
        if task is None:
            raise HTTPException(status_code=404, detail="Task not found")
        return {"success": True, "task": task}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update task: {str(e)}")


@app.delete("/api/tasks/{task_id}")
async def delete_task(task_id: int):
    """删除任务"""
    try:
        deleted = _db_delete_task(task_id)
        return {"success": True, "deleted": deleted}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete task: {str(e)}")


# ==================== AI 生图历史 ====================

@app.get("/api/art-pics")
async def list_art_pics():
    """获取 AI 生图历史列表"""
    try:
        pics = []
        if os.path.isdir(ART_PIC_DIR):
            for fname in sorted(os.listdir(ART_PIC_DIR), reverse=True):
                if not fname.endswith(".png") and not fname.endswith(".jpg"):
                    continue
                meta_path = os.path.join(ART_PIC_DIR, fname + ".json")
                meta = {}
                if os.path.exists(meta_path):
                    with open(meta_path, "r", encoding="utf-8") as f:
                        meta = json.load(f)
                pics.append({
                    "filename": fname,
                    "url": f"/pindou_pic/{fname}",
                    "prompt": meta.get("prompt", ""),
                    "model": meta.get("model", ""),
                    "created_at": meta.get("created_at", ""),
                })
        return {"success": True, "pics": pics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list art pics: {str(e)}")


@app.delete("/api/art-pics")
async def clear_art_pics():
    """清空 AI 生图历史"""
    try:
        if os.path.isdir(ART_PIC_DIR):
            for fname in os.listdir(ART_PIC_DIR):
                fpath = os.path.join(ART_PIC_DIR, fname)
                if os.path.isfile(fpath):
                    os.remove(fpath)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear art pics: {str(e)}")


# Mount pindou_pic as static files (must be after API routes)
app.mount("/pindou_pic", StaticFiles(directory=ART_PIC_DIR), name="pindou_pic")

