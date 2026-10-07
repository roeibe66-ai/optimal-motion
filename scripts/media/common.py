"""Shared helpers for the exercise media pipeline (scripts/media/*).

Paths are relative to the repo root. media/raw/{videos,images} are symlinks
to the Desktop folders the raw files are dropped into; nothing in this
pipeline ever writes to them.
"""
import json
import os
import re
import shutil
import subprocess
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MEDIA = ROOT / "media"
RAW_DIRS = [MEDIA / "raw" / "videos", MEDIA / "raw" / "images"]
OUT = MEDIA / "out"
CACHE = MEDIA / ".cache"
MANIFEST = MEDIA / "manifest.csv"
OVERRIDES = MEDIA / "match_overrides.csv"
TRACKER_DIR = Path(os.environ.get("MEDIA_TRACKER_DIR", Path.home() / "Desktop"))

VIDEO_EXT = {".mp4", ".mov", ".webm"}
IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp"}
VIEWS = {"side": "diag", "front": "front", "rear": "rear", "front34": "front34"}

# Homebrew isn't on the PATH of every shell this runs from.
for p in ("/opt/homebrew/bin", "/usr/local/bin"):
    if p not in os.environ.get("PATH", "").split(":"):
        os.environ["PATH"] = p + ":" + os.environ.get("PATH", "")


def load_env():
    """Read .env / .env.local without exporting anything to child processes."""
    env = {}
    for name in (".env", ".env.local"):
        f = ROOT / name
        if not f.exists():
            continue
        for line in f.read_text().splitlines():
            if "=" not in line or line.lstrip().startswith("#"):
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    url = env.get("SUPABASE_URL") or env.get("NEXT_PUBLIC_SUPABASE_URL")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise SystemExit("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env/.env.local")
    return url.rstrip("/"), key


def rest_get(path):
    url, key = load_env()
    req = urllib.request.Request(f"{url}/rest/v1/{path}", headers={"apikey": key, "Authorization": f"Bearer {key}"})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def fetch_exercises():
    return rest_get("exercises?select=id,name_en,name_he,equipment&order=name_en")


def strip_exts(name):
    """'push-up_front.mp4.mp4' -> ('push-up_front', '.mp4'); the LAST extension decides the kind."""
    last = Path(name).suffix.lower()
    stem = name
    while Path(stem).suffix.lower() in VIDEO_EXT | IMAGE_EXT:
        stem = stem[: -len(Path(stem).suffix)]
    return stem, last


def slugify(s):
    s = s.lower().replace("&", " and ")
    s = re.sub(r"\(.*?\)", " ", s)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def require_ffmpeg():
    for tool in ("ffmpeg", "ffprobe"):
        if not shutil.which(tool):
            raise SystemExit(f"{tool} not found on PATH")


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"{' '.join(map(str, cmd))}\n{r.stderr[-2000:]}")
    return r.stdout


def probe(path):
    out = run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
               "stream=width,height:format=duration", "-of", "json", str(path)])
    j = json.loads(out)
    s = j["streams"][0]
    return {"width": s["width"], "height": s["height"], "duration": float(j["format"].get("duration") or 0)}
