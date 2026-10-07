"""Phase 1: scan media/raw/, match each file to an exercise, write media/manifest.csv.

    python3 scripts/media/build_manifest.py            # (re)build, keeping manual edits
    python3 scripts/media/build_manifest.py --reset    # discard manual edits in manifest.csv

Re-running keeps the hand-editable columns (aspect, crop_x_offset, loop_mode,
position, view, approved) of rows whose raw_path is already in the manifest.
Ambiguous/unmatched names go to media/report_unmatched.txt and are resolved by
adding a row to media/match_overrides.csv (file_base,exercise_id,slug,note).

Decisions (2026-10-07): every file in media/raw/ counts as approved (the
tracker's status column isn't maintained); the view suffix is informational
only - position 0 is the exercise's primary media, and by default the
diagonal ("side") view comes first.
"""
import argparse
import csv
import re
import sys
from difflib import SequenceMatcher

from PIL import Image, ImageChops, ImageStat

from common import (CACHE, IMAGE_EXT, MANIFEST, MEDIA, OVERRIDES, RAW_DIRS, ROOT, TRACKER_DIR, VIDEO_EXT, VIEWS,
                    fetch_exercises, require_ffmpeg, run, slugify, strip_exts)

COLUMNS = ["exercise_slug", "exercise_name_en", "exercise_id", "view", "kind", "raw_path", "aspect",
           "crop_x_offset", "loop_mode", "position", "approved", "notes"]
KEEP_ON_REBUILD = ["aspect", "crop_x_offset", "loop_mode", "position", "view", "approved"]

# Tracker family (first char of the "משפחה" column) -> default aspect.
FAMILY_ASPECT = {
    "A": "4:5",   # hangs & pull-ups
    "B": "16:9",  # levers & skin the cat: body ends up horizontal
    "C": "16:9",  # box push-ups
    "D": "16:9",  # body rows
    "E": "16:9",  # rings (flys, rollouts)
    "F": "4:5",   # dips & support
    "ז": "16:9",  # push-ups, abs, floor
    "ט": "16:9",  # planche & pike
    "י": "16:9",  # bridges & rear delts
    "כ": "4:5",   # seated leg raises
    "ל": "4:5",   # standing lower body
    "מ": "16:9",  # hip mobility & floor sitting (pancake, straddle)
    "נ": "4:5",   # shoulder/elbow/wrist
    "ס": "16:9",  # spine flows
}
# Gym family ("ח") and anything without a tracker row: horizontal if the name says so.
HORIZONTAL_RE = re.compile(r"lying|laying|bench press|dumbbell press|flys?\b|pull ?over|crunch|hip thrust|leg press|"
                           r"push.?up|plank|row\b|rollout|bridge|lever|planche|pancake|straddle sit|skin the cat")
UPRIGHT_RE = re.compile(r"^(standing|seated)\b|handstand")  # wins over the family default
VIEW_ORDER = ["diag", "front", "rear", "front34"]  # primary angle first
ENDFRAME_PINGPONG = 18.0  # mean abs grey diff (0-255) between first and last frame


def norm(s):
    s = re.sub(r"\(.*?\)", " ", (s or "").lower())
    s = s.replace("dumbbel ", "dumbbell ")
    s = re.sub(r"[^a-z0-9]+", " ", s)
    s = re.sub(r"\b(\w+?)s\b", r"\1", s)  # crude singular: flys/fly, curls/curl
    return " ".join(s.split())


def is_latin(s):
    return bool(s) and not re.search(r"[֐-׿]", s)


def english_name(ex):
    return ex.get("name_en") or (ex.get("name_he") if is_latin(ex.get("name_he")) else "") or ""


def read_tracker():
    """stem -> family, and normalized English exercise name -> family."""
    import openpyxl
    by_stem, by_name = {}, {}
    f = TRACKER_DIR / "Eccentric_all_image_prompts.xlsx"
    if not f.exists():
        print(f"warning: tracker not found at {f}; aspects fall back to name keywords", file=sys.stderr)
        return by_stem, by_name
    ws = openpyxl.load_workbook(f, read_only=True, data_only=True)["כל הפרומפטים"]
    rows = ws.iter_rows(values_only=True)
    header = next(rows)
    i_name, i_family, i_stem = header.index("תרגיל"), header.index("משפחה"), header.index("שם קובץ")
    for r in rows:
        if not r[i_name]:
            continue
        family = (r[i_family] or "").strip()
        if r[i_stem]:
            by_stem[str(r[i_stem]).strip().lower()] = family
        by_name.setdefault(norm(r[i_name]), family)
    return by_stem, by_name


def read_overrides():
    if not OVERRIDES.exists():
        return {}
    with OVERRIDES.open(newline="", encoding="utf-8") as f:
        return {r["file_base"].strip(): r for r in csv.DictReader(f) if r.get("file_base", "").strip()}


def split_view(stem):
    m = re.match(r"^(.*?)[_-](side|front34|front|rear)$", stem, re.I)
    if m:
        return m.group(1), VIEWS[m.group(2).lower()]
    return stem, ""


def match(base, exercises):
    """-> (exercise|None, status, candidates)"""
    key = norm(base.replace("_", " ").replace("-", " "))
    scored = sorted(((SequenceMatcher(None, key, norm(english_name(e))).ratio(), e) for e in exercises if english_name(e)),
                    key=lambda t: -t[0])
    exact = [e for s, e in scored if s == 1.0]
    if len(exact) > 1:  # "Dip" vs "Dips (Wide grip)": prefer the one without a qualifier
        exact = [e for e in exact if "(" not in english_name(e)] or exact
    if len(exact) == 1:
        return exact[0], "exact", scored[:3]
    best, second = scored[0][0], scored[1][0]
    if best >= 0.9 and best - second >= 0.06:
        return scored[0][1], f"fuzzy {best:.2f}", scored[:3]
    return None, "ambiguous" if best >= 0.6 else "unmatched", scored[:3]


def endframe_diff(path):
    """How different the last frame is from the first: high = one-directional clip."""
    CACHE.mkdir(parents=True, exist_ok=True)
    a, b = CACHE / "first.png", CACHE / "last.png"
    run(["ffmpeg", "-y", "-v", "error", "-i", str(path), "-frames:v", "1", "-vf", "scale=160:-2,format=gray", str(a)])
    run(["ffmpeg", "-y", "-v", "error", "-sseof", "-0.1", "-i", str(path), "-frames:v", "1", "-update", "1",
         "-vf", "scale=160:-2,format=gray", str(b)])
    return ImageStat.Stat(ImageChops.difference(Image.open(a), Image.open(b))).mean[0]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--reset", action="store_true", help="ignore manual edits in the existing manifest")
    args = ap.parse_args()
    require_ffmpeg()

    exercises = fetch_exercises()
    by_id = {e["id"]: e for e in exercises}
    by_stem, by_family_name = read_tracker()
    overrides = read_overrides()
    previous = {}
    if MANIFEST.exists() and not args.reset:
        with MANIFEST.open(newline="", encoding="utf-8") as f:
            previous = {r["raw_path"]: r for r in csv.DictReader(f)}

    rows, problems = [], []
    files = sorted(p for d in RAW_DIRS if d.exists() for p in d.iterdir() if not p.name.startswith("."))
    for p in files:
        stem, ext = strip_exts(p.name)
        if ext not in VIDEO_EXT | IMAGE_EXT:
            problems.append(f"SKIPPED (unknown type)  {p.name}")
            continue
        kind = "video" if ext in VIDEO_EXT else "image"
        base, view = split_view(stem.strip())
        notes = []
        if p.name.count(".") > 1:
            notes.append("double extension in filename")

        ov = overrides.get(base) or overrides.get(stem)
        if ov and ov.get("exercise_id", "").strip().lower() == "skip":
            problems.append(f"SKIPPED    {p.name} ({ov.get('note', '')})")
            continue
        if ov and ov.get("exercise_id"):
            ex = by_id.get(ov["exercise_id"].strip())
            status = "override" if ex else "override id not found"
            cands = []
        else:
            ex, status, cands = match(base, exercises)
        name_en = english_name(ex) if ex else ""
        slug = (ov or {}).get("slug", "").strip() or slugify(name_en or base)
        if status != "exact":
            notes.append(f"match: {status}")
        if not ex:
            problems.append(f"{status.upper():10} {p.name}\n" +
                            "".join(f"             candidate {s:.2f}  {english_name(e)}  ({e['id']})\n" for s, e in cands))

        family = by_stem.get(f"{slugify(base)}_{'side' if view == 'diag' else view}") or by_family_name.get(norm(name_en or base), "")
        letter = family[:1]
        aspect = "4:5" if UPRIGHT_RE.search(norm(name_en or base)) else FAMILY_ASPECT.get(letter) or ("16:9" if HORIZONTAL_RE.search(norm(name_en or base)) else "4:5")
        notes.append(f"family: {family or 'none -> name keywords'}")

        loop_mode = "none"
        if kind == "video":
            d = endframe_diff(p)
            if d > ENDFRAME_PINGPONG:
                loop_mode = "pingpong"
            notes.append(f"endframe_diff={d:.1f}")

        row = {"exercise_slug": slug, "exercise_name_en": name_en, "exercise_id": ex["id"] if ex else "",
               "view": view or "diag", "kind": kind, "raw_path": str(p.relative_to(ROOT)), "aspect": aspect,
               "crop_x_offset": "", "loop_mode": loop_mode, "position": "", "approved": "true", "notes": "; ".join(notes)}
        prev = previous.get(row["raw_path"])
        if prev:
            for k in KEEP_ON_REBUILD:
                if prev.get(k, "") != "":
                    row[k] = prev[k]
        rows.append(row)

    # One primary (position 0) per exercise; extra files get 1, 2... and a note.
    by_slug = {}
    for r in rows:
        by_slug.setdefault(r["exercise_slug"], []).append(r)
    for slug, group in by_slug.items():
        group.sort(key=lambda r: (r["position"] or "9", r["kind"] != "video", VIEW_ORDER.index(r["view"]), r["raw_path"]))
        for i, r in enumerate(group):
            r["position"] = r["position"] or str(i)
        if len(group) > 1:
            problems.append(f"MULTIPLE   {slug}: " + ", ".join(f"{r['raw_path'].split('/')[-1]} (pos {r['position']}, {r['view']})" for r in group))
        keys = [(r["view"], r["kind"]) for r in group]
        if len(set(keys)) != len(keys):
            problems.append(f"CONFLICT   {slug}: two files share view+kind {keys} - set a different view in manifest.csv")

    rows.sort(key=lambda r: (r["exercise_slug"], int(r["position"])))
    with MANIFEST.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS)
        w.writeheader()
        w.writerows(rows)
    (MEDIA / "report_unmatched.txt").write_text(
        "Files that need a decision. Resolve by adding a row to media/match_overrides.csv\n"
        "(file_base = filename without view suffix/extension).\n\n" + ("\n".join(problems) or "none") + "\n", encoding="utf-8")
    matched = sum(1 for r in rows if r["exercise_id"])
    print(f"{len(rows)} files -> {MANIFEST.relative_to(ROOT)} ({matched} matched, {len(rows) - matched} need a decision)")
    print(f"report: media/report_unmatched.txt ({len(problems)} entries)")


if __name__ == "__main__":
    main()
