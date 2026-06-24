"""
拼豆盘任务管理 - 本地文件存储
数据保存在 pindou_task/ 目录下的 JSON 文件中
"""
import os
import json
import threading
from typing import Optional, List, Dict, Any
from datetime import datetime

DB_DIR = os.path.dirname(os.path.abspath(__file__))

_lock = threading.Lock()


def _tasks_path() -> str:
    return os.path.join(DB_DIR, "tasks.json")


def _load_tasks() -> List[Dict[str, Any]]:
    path = _tasks_path()
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _save_tasks(tasks: List[Dict[str, Any]]) -> None:
    path = _tasks_path()
    with open(path, "w", encoding="utf-8") as f:
        json.dump(tasks, f, ensure_ascii=False, indent=2)


def _next_id(tasks: List[Dict[str, Any]]) -> int:
    if not tasks:
        return 1
    return max(t.get("id", 0) for t in tasks) + 1


def get_tasks(
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> Dict[str, Any]:
    with _lock:
        tasks = _load_tasks()

    # Filter
    filtered = tasks
    if status:
        filtered = [t for t in filtered if t.get("status") == status]
    if search:
        filtered = [t for t in filtered if search.lower() in (t.get("name") or "").lower()]

    total = len(filtered)

    # Sort by updated_at desc
    filtered.sort(key=lambda t: t.get("updated_at") or t.get("created_at") or "", reverse=True)

    # Paginate
    page = filtered[offset: offset + limit]

    return {
        "success": True,
        "tasks": page,
        "count": len(page),
        "total": total,
    }


def create_task(data: Dict[str, Any]) -> Dict[str, Any]:
    with _lock:
        tasks = _load_tasks()
        now = datetime.utcnow().isoformat()
        task = {
            "id": _next_id(tasks),
            "name": data.get("name", "未命名任务"),
            "description": data.get("description", ""),
            "status": data.get("status", "pending"),
            "pixel_matrix": data.get("pixel_matrix"),
            "color_summary": data.get("color_summary"),
            "grid_width": data.get("grid_width", 0),
            "grid_height": data.get("grid_height", 0),
            "total_beads": data.get("total_beads", 0),
            "palette_preset": data.get("palette_preset", "221"),
            "settings": data.get("settings"),
            "preview_image": data.get("preview_image"),
            "progress_percent": data.get("progress_percent", 0),
            "beads_placed": data.get("beads_placed", 0),
            "created_at": now,
            "updated_at": now,
        }
        tasks.append(task)
        _save_tasks(tasks)
    return {"success": True, "task": task}


def get_task(task_id: int) -> Optional[Dict[str, Any]]:
    with _lock:
        tasks = _load_tasks()
    for t in tasks:
        if t.get("id") == task_id:
            return t
    return None


def update_task(task_id: int, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    with _lock:
        tasks = _load_tasks()
        task = None
        for t in tasks:
            if t.get("id") == task_id:
                task = t
                break
        if task is None:
            return None

        allowed_fields = [
            "name", "description", "status", "pixel_matrix", "color_summary",
            "grid_width", "grid_height", "total_beads", "palette_preset",
            "settings", "preview_image", "progress_percent", "beads_placed",
        ]
        for field in allowed_fields:
            if field in data:
                task[field] = data[field]
        task["updated_at"] = datetime.utcnow().isoformat()
        _save_tasks(tasks)
    return task


def delete_task(task_id: int) -> bool:
    with _lock:
        tasks = _load_tasks()
        new_tasks = [t for t in tasks if t.get("id") != task_id]
        deleted = len(new_tasks) < len(tasks)
        _save_tasks(new_tasks)
    return deleted
