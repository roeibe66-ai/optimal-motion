"""Phase 2: compress/crop every approved manifest row into media/out/.

    python3 scripts/media/process_media.py --dry-run          # show what would run
    python3 scripts/media/process_media.py --only push-up dip # just these slugs
    python3 scripts/media/process_media.py                    # everything approved

Idempotent: each output is named by a hash of (raw bytes + recipe settings),
and media/out/index.json remembers what was produced, so unchanged files are
skipped. Raw files are only ever read.

Outputs (per manifest row):
  video -> media/out/<slug>/<slug>_<view>_<hash8>.mp4  + same name .webp poster
  image -> media/out/<slug>/<slug>_<view>_<hash8>.webp

WebP is written with Pillow because the Homebrew ffmpeg build has no libwebp.
"""
import argparse
import csv
import hashlib
import json
import logging
import sys

from PIL import Image

from common import CACHE, MANIFEST, OUT, ROOT, probe, require_ffmpeg, run

RECIPE = "v1"  # bump to force every file to re-encode after changing the settings below
X264 = ["-c:v", "libx264", "-preset", "slow", "-crf", "27", "-pix_fmt", "yuv420p", "-movflags", "+faststart"]
VIDEO_SIZE = {"4:5": (720, 900), "16:9": (1280, 720)}
IMAGE_LONG_SIDE = 1600
POSTER_QUALITY, IMAGE_QUALITY = 70, 85
INDEX = OUT / "index.json"

log = logging.getLogger("process_media")


def content_hash(row):
    h = hashlib.sha256()
    with open(ROOT / row["raw_path"], "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    h.update(f"|{RECIPE}|{row['aspect']}|{row['crop_x_offset']}|{row['loop_mode']}|{row['kind']}".encode())
    return h.hexdigest()


def offset(row):
    o = float(row["crop_x_offset"] or 0.5)
    if not 0 <= o <= 1:
        raise ValueError(f"crop_x_offset must be 0..1, got {o}")
    return o


def video_filter(row):
    w, h = VIDEO_SIZE[row["aspect"]]
    if row["aspect"] == "4:5":
        crop = f"crop=trunc(ih*4/5/2)*2:ih:(iw-trunc(ih*4/5/2)*2)*{offset(row)}:0,"
    else:
        crop = ""  # sources are already 16:9
    return f"{crop}scale={w}:{h},fps=24"


def video_cmds(row, src, out_mp4, out_poster_png):
    vf = video_filter(row)
    if row["loop_mode"] == "pingpong":
        enc = ["ffmpeg", "-y", "-v", "error", "-i", str(src), "-an", "-filter_complex",
               f"[0:v]{vf},split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1[v]", "-map", "[v]", *X264, str(out_mp4)]
    else:
        enc = ["ffmpeg", "-y", "-v", "error", "-i", str(src), "-an", "-vf", vf, *X264, str(out_mp4)]
    poster = ["ffmpeg", "-y", "-v", "error", "-i", str(out_mp4), "-frames:v", "1", str(out_poster_png)]
    return [enc, poster]


def to_webp(png, out, quality):
    Image.open(png).convert("RGB").save(out, "WEBP", quality=quality, method=6)


def process_image(row, src, out):
    im = Image.open(src).convert("RGB")
    W, H = im.size
    target = 4 / 5 if row["aspect"] == "4:5" else 16 / 9
    if W / H > target:  # too wide: crop width, honoring crop_x_offset
        cw = round(H * target)
        x = round((W - cw) * offset(row))
        im = im.crop((x, 0, x + cw, H))
    elif W / H < target:  # too tall: crop height, centered
        ch = round(W / target)
        y = (H - ch) // 2
        im = im.crop((0, y, W, y + ch))
    scale = IMAGE_LONG_SIDE / max(im.size)
    if scale < 1:
        im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    else:
        log.warning("%s: %dx%d after crop is below the %dpx target - not upscaling", row["raw_path"], *im.size, IMAGE_LONG_SIDE)
    im.save(out, "WEBP", quality=IMAGE_QUALITY, method=6)
    return im.size


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--only", nargs="*", help="exercise slugs to process")
    ap.add_argument("--force", action="store_true", help="re-encode even if unchanged")
    args = ap.parse_args()

    OUT.mkdir(parents=True, exist_ok=True)
    CACHE.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s",
                        handlers=[logging.StreamHandler(sys.stdout), logging.FileHandler(OUT / "process.log")])
    require_ffmpeg()

    index = json.loads(INDEX.read_text()) if INDEX.exists() else {}
    with MANIFEST.open(newline="", encoding="utf-8") as f:
        rows = [r for r in csv.DictReader(f) if r["approved"].lower() == "true" and r["exercise_id"]]
    if args.only:
        rows = [r for r in rows if r["exercise_slug"] in args.only]

    done = skipped = failed = 0
    for row in rows:
        src = ROOT / row["raw_path"]
        h = content_hash(row)
        stem = f"{row['exercise_slug']}_{row['view']}_{h[:8]}"
        folder = OUT / row["exercise_slug"]
        prev = index.get(row["raw_path"])
        if prev and prev["hash"] == h and not args.force and all((OUT / p).exists() for p in prev["files"]):
            skipped += 1
            continue
        try:
            if row["kind"] == "video":
                mp4, poster = folder / f"{stem}.mp4", folder / f"{stem}.webp"
                png = CACHE / f"{stem}.png"
                cmds = video_cmds(row, src, mp4, png)
                if args.dry_run:
                    log.info("DRY %s\n  %s\n  %s\n  -> %s (+ poster)", row["raw_path"], *(" ".join(c) for c in cmds), mp4.relative_to(ROOT))
                    continue
                folder.mkdir(parents=True, exist_ok=True)
                for c in cmds:
                    run(c)
                to_webp(png, poster, POSTER_QUALITY)
                meta = probe(mp4)
                entry = {"path": str(mp4.relative_to(OUT)), "poster_path": str(poster.relative_to(OUT)),
                         "width": meta["width"], "height": meta["height"], "duration_s": round(meta["duration"], 2),
                         "bytes": mp4.stat().st_size, "poster_bytes": poster.stat().st_size}
            else:
                webp = folder / f"{stem}.webp"
                if args.dry_run:
                    log.info("DRY %s -> %s (crop %s, long side <= %d, q%d)", row["raw_path"], webp.relative_to(ROOT),
                             row["aspect"], IMAGE_LONG_SIDE, IMAGE_QUALITY)
                    continue
                folder.mkdir(parents=True, exist_ok=True)
                w, hgt = process_image(row, src, webp)
                entry = {"path": str(webp.relative_to(OUT)), "poster_path": None, "width": w, "height": hgt,
                         "duration_s": None, "bytes": webp.stat().st_size}
            # Drop this row's previous outputs once the new ones exist.
            for old in (prev or {}).get("files", []):
                if old not in (entry["path"], entry["poster_path"]):
                    (OUT / old).unlink(missing_ok=True)
            entry.update(hash=h, files=[p for p in (entry["path"], entry["poster_path"]) if p],
                         **{k: row[k] for k in ("exercise_slug", "exercise_id", "view", "kind", "aspect", "loop_mode", "position")})
            index[row["raw_path"]] = entry
            INDEX.write_text(json.dumps(index, indent=2, ensure_ascii=False))
            done += 1
            log.info("OK  %-45s %6.0f KB  %sx%s", entry["path"], entry["bytes"] / 1024, entry["width"], entry["height"])
        except Exception as e:  # keep going; one bad file shouldn't stop the batch
            failed += 1
            log.error("FAIL %s: %s", row["raw_path"], e)

    vids = [e for e in index.values() if e["kind"] == "video"]
    total = sum(e["bytes"] + (e.get("poster_bytes") or 0) for e in index.values())
    log.info("processed %d, unchanged %d, failed %d | in index: %d files, %.1f MB total, avg video %.0f KB",
             done, skipped, failed, len(index), total / 1e6, (sum(e["bytes"] for e in vids) / len(vids) / 1024) if vids else 0)
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
