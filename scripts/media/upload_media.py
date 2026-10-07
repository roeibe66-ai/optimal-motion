"""Phase 3: upload media/out/ to the `exercise-media` bucket and upsert exercise_media rows.

    python3 scripts/media/upload_media.py --dry-run
    python3 scripts/media/upload_media.py [--only slug ...] [--views 5000]

Reads media/out/index.json (written by process_media.py). Object paths are
content-hashed (v<VERSION>/<slug>/<file>), so an object that already exists is
never re-uploaded; rows are upserted on (exercise_slug, view, kind).
Uses SUPABASE_SERVICE_ROLE_KEY from .env/.env.local - local machine only.
"""
import argparse
from datetime import datetime, timezone
import json
import sys
import urllib.error
import urllib.request

from common import OUT, load_env

BUCKET = "exercise-media"
VERSION = 1
INDEX = OUT / "index.json"
MIME = {".mp4": "video/mp4", ".webp": "image/webp"}


def request(method, url, key, body=None, headers=None):
    req = urllib.request.Request(url, data=body, method=method,
                                 headers={"apikey": key, "Authorization": f"Bearer {key}", **(headers or {})})
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def object_path(slug, rel):
    return f"v{VERSION}/{slug}/{rel.split('/')[-1]}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--only", nargs="*")
    ap.add_argument("--views", type=int, default=10000, help="exercise media views per month, for the bandwidth estimate")
    args = ap.parse_args()

    url, key = load_env()
    index = json.loads(INDEX.read_text())
    entries = [e for e in index.values() if not args.only or e["exercise_slug"] in args.only]

    uploaded = existed = up_bytes = 0
    rows = []
    for e in entries:
        slug = e["exercise_slug"]
        for rel in e["files"]:
            obj = object_path(slug, rel)
            local = OUT / rel
            if args.dry_run:
                print(f"DRY upload {local.relative_to(OUT)} -> {BUCKET}/{obj} ({local.stat().st_size / 1024:.0f} KB)")
                continue
            status, _ = request("HEAD", f"{url}/storage/v1/object/public/{BUCKET}/{obj}", key)
            if status == 200:
                existed += 1
                continue
            data = local.read_bytes()
            status, body = request("POST", f"{url}/storage/v1/object/{BUCKET}/{obj}", key, data,
                                   {"Content-Type": MIME[local.suffix], "Cache-Control": "max-age=31536000",
                                    "x-upsert": "false"})
            if status not in (200, 201):
                sys.exit(f"upload failed {obj}: {status} {body[:300]!r}")
            uploaded += 1
            up_bytes += len(data)
            print(f"uploaded {BUCKET}/{obj} ({len(data) / 1024:.0f} KB)")
        rows.append({
            "exercise_id": e["exercise_id"], "exercise_slug": slug, "view": e["view"], "kind": e["kind"],
            "position": int(e["position"] or 0), "path": object_path(slug, e["path"]),
            "poster_path": object_path(slug, e["poster_path"]) if e.get("poster_path") else None,
            "aspect": e["aspect"], "width": e["width"], "height": e["height"], "duration_s": e["duration_s"],
            "bytes": e["bytes"], "loop_mode": e["loop_mode"], "version": VERSION, "approved": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })

    if args.dry_run:
        print(f"DRY upsert {len(rows) or len(entries)} exercise_media rows")
    elif rows:
        status, body = request("POST", f"{url}/rest/v1/exercise_media?on_conflict=exercise_slug,view,kind", key,
                               json.dumps(rows).encode(),
                               {"Content-Type": "application/json", "Prefer": "resolution=merge-duplicates,return=minimal"})
        if status not in (200, 201, 204):
            sys.exit(f"upsert failed: {status} {body[:500]!r}")

    vids = [e for e in entries if e["kind"] == "video"]
    total = sum(e["bytes"] + (e.get("poster_bytes") or 0) for e in entries)
    avg = (sum(e["bytes"] + e.get("poster_bytes", 0) for e in vids) / len(vids)) if vids else 0
    print(f"\n{len(entries)} media rows, {sum(len(e['files']) for e in entries)} files, {total / 1e6:.1f} MB total"
          f" | uploaded {uploaded} ({up_bytes / 1e6:.1f} MB), already there {existed}")
    print(f"avg video+poster {avg / 1024:.0f} KB -> ~{avg * args.views / 1e9:.2f} GB/month egress at {args.views} views/month"
          " (first loads only; browsers cache the immutable files for a year)")


if __name__ == "__main__":
    main()
