"""Build media/out/review.html: one row per raw file for a manual match review.

    python3 scripts/media/review_page.py

Columns: original filename, matched exercise (EN/HE + id), view, kind/aspect,
angle order, how it was matched, output size, and a poster thumbnail. Skipped
files (match_overrides.csv "skip") are listed too, with a thumbnail made from
the raw file. Thumbnails are embedded, so the page works offline and doesn't
depend on the bucket. Read-only: nothing is uploaded or written to Supabase.
"""
import base64
import csv
import html
import io
import json
import subprocess
from datetime import date

from PIL import Image

from common import IMAGE_EXT, MANIFEST, OUT, OVERRIDES, RAW_DIRS, ROOT, fetch_exercises, strip_exts

THUMB_H = 96


def thumb_data_uri(path):
    if path.suffix.lower() in IMAGE_EXT or path.suffix.lower() == ".webp":
        im = Image.open(path)
    else:  # raw video of a skipped file: grab its first frame
        png = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "-"],
                             capture_output=True, check=True).stdout
        im = Image.open(io.BytesIO(png))
    im = im.convert("RGB")
    im.thumbnail((THUMB_H * 2, THUMB_H))
    buf = io.BytesIO()
    im.save(buf, "WEBP", quality=70)
    return "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()


def main():
    by_id = {e["id"]: e for e in fetch_exercises()}
    index = json.loads((OUT / "index.json").read_text()) if (OUT / "index.json").exists() else {}
    with MANIFEST.open(newline="", encoding="utf-8") as f:
        manifest = {r["raw_path"]: r for r in csv.DictReader(f)}
    overrides = {}
    if OVERRIDES.exists():
        with OVERRIDES.open(newline="", encoding="utf-8") as f:
            overrides = {r["file_base"]: r for r in csv.DictReader(f)}

    rows = []
    for p in sorted((p for d in RAW_DIRS if d.exists() for p in d.iterdir() if not p.name.startswith(".")), key=lambda p: p.name.lower()):
        rel = str(p.relative_to(ROOT))
        m = manifest.get(rel)
        entry = index.get(rel)
        if m:
            ex = by_id.get(m["exercise_id"], {})
            how = next((part.split(": ", 1)[1] for part in m["notes"].split("; ") if part.startswith("match: ")), "exact")
            thumb_src = OUT / (entry.get("poster_path") or entry["path"]) if entry else p
            rows.append({
                "file": p.name, "folder": p.parent.name, "status": "processed" if entry else "not processed",
                "en": ex.get("name_en") or ex.get("name_he") or "", "he": ex.get("name_he") if ex.get("name_en") else "",
                "id": m["exercise_id"], "view": m["view"], "kind": m["kind"], "aspect": m["aspect"],
                "angle": "primary" if m["position"] == "0" else f"angle {int(m['position']) + 1}",
                "how": how, "kb": round(entry["bytes"] / 1024) if entry else None, "thumb": thumb_data_uri(thumb_src),
            })
        else:
            stem, _ = strip_exts(p.name)
            base = stem.rsplit("_", 1)[0] if stem.rsplit("_", 1)[-1] in ("side", "front", "rear", "front34") else stem
            note = (overrides.get(base) or {}).get("note", "not in manifest")
            rows.append({"file": p.name, "folder": p.parent.name, "status": "skipped", "en": "", "he": "", "id": "",
                         "view": "", "kind": "", "aspect": "", "angle": "", "how": note, "kb": None, "thumb": thumb_data_uri(p)})

    processed = [r for r in rows if r["status"] == "processed"]
    total_kb = sum(r["kb"] or 0 for r in processed)
    esc = html.escape
    body = "\n".join(f"""
    <tr class="{r['status'].replace(' ', '-')}">
      <td class="n">{i}</td>
      <td><img src="{r['thumb']}" alt="" loading="lazy"></td>
      <td><code>{esc(r['file'])}</code><div class="sub">{esc(r['folder'])}</div></td>
      <td>{f'<b>{esc(r["en"])}</b><div class="sub" dir="rtl">{esc(r["he"] or "")}</div><div class="sub id">{esc(r["id"])}</div>' if r['id'] else f'<span class="skip">{esc(r["how"])}</span>'}</td>
      <td data-l="View">{esc(r['view'])}</td>
      <td data-l="Kind">{esc(r['kind'])} <span class="sub">{esc(r['aspect'])}</span></td>
      <td data-l="Order">{esc(r['angle'])}</td>
      <td class="how" data-l="Matched by">{esc(r['how']) if r['id'] else ''}</td>
      <td class="num" data-l="Size">{f"{r['kb']} KB" if r['kb'] else ''}</td>
      <td class="ok"><input type="checkbox" aria-label="match confirmed: {esc(r['file'])}" {'disabled' if not r['id'] else ''}></td>
    </tr>""" for i, r in enumerate(rows, 1))

    page = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Media Match Review</title>
<style>
  :root {{ --bg:#f6f7f9; --card:#fff; --fg:#111827; --muted:#6b7280; --line:#e5e7eb; --accent:#0f766e; --warn:#b45309; --studio:#0B1220; }}
  @media (prefers-color-scheme: dark) {{ :root {{ --bg:#0b0f17; --card:#121826; --fg:#e5e7eb; --muted:#9ca3af; --line:#243042; --accent:#5eead4; --warn:#fbbf24; }} }}
  body {{ margin:0; background:var(--bg); color:var(--fg); font:14px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; }}
  header {{ padding:20px 16px 8px; max-width:1200px; margin:auto; }}
  h1 {{ font-size:20px; margin:0 0 4px; }}
  .meta {{ color:var(--muted); }}
  .wrap {{ max-width:1200px; margin:auto; padding:0 16px 32px; overflow-x:auto; }}
  table {{ width:100%; border-collapse:collapse; background:var(--card); border:1px solid var(--line); border-radius:12px; overflow:hidden; }}
  th, td {{ text-align:left; padding:8px 10px; border-bottom:1px solid var(--line); vertical-align:middle; }}
  th {{ font-size:12px; text-transform:uppercase; letter-spacing:.04em; color:var(--muted); background:var(--card); position:sticky; top:0; }}
  td img {{ height:{THUMB_H}px; max-width:{THUMB_H * 2}px; border-radius:8px; background:var(--studio); display:block; }}
  .sub {{ color:var(--muted); font-size:12px; }}
  .id {{ font-family:ui-monospace, monospace; font-size:11px; }}
  .n, .num {{ color:var(--muted); font-variant-numeric:tabular-nums; white-space:nowrap; }}
  .how {{ font-size:12px; color:var(--muted); }}
  tr.skipped td {{ opacity:.6; }}
  .skip {{ color:var(--warn); font-weight:600; }}
  .ok input {{ width:20px; height:20px; accent-color:var(--accent); }}
  code {{ font-size:12.5px; word-break:break-all; }}
  #progress {{ font-weight:600; color:var(--accent); }}
  /* Phone / narrow pane: each row becomes a card, thumbnail on top. */
  @media (max-width: 760px) {{
    table, tbody, tr, td {{ display:block; width:auto; }}
    thead {{ display:none; }}
    table {{ border:0; background:none; }}
    tr {{ background:var(--card); border:1px solid var(--line); border-radius:12px; margin-bottom:12px; padding:10px; position:relative; }}
    td {{ border:0; padding:3px 0; }}
    td img {{ height:auto; width:100%; max-width:none; }}
    td.n {{ position:absolute; top:14px; left:16px; color:#fff; font-weight:700; text-shadow:0 1px 3px #000; }}
    td.ok {{ position:absolute; top:14px; right:16px; }}
    td[data-l]:not(:empty)::before {{ content:attr(data-l) ": "; color:var(--muted); font-size:12px; }}
  }}
</style>
</head>
<body>
<header>
  <h1>Media match review</h1>
  <div class="meta">{date.today().isoformat()} · {len(rows)} raw files · {len(processed)} processed ({total_kb / 1024:.1f} MB, posters not counted) ·
    {len(rows) - len(processed)} skipped · <span id="progress"></span></div>
</header>
<div class="wrap">
<table>
  <thead><tr><th>#</th><th>Poster</th><th>Original file</th><th>Matched exercise</th><th>View</th><th>Kind</th><th>Order</th><th>Matched by</th><th>Size</th><th>OK</th></tr></thead>
  <tbody>{body}
  </tbody>
</table>
</div>
<script>
  // Ticks are for your own pass through the list; kept in this browser only.
  const boxes = [...document.querySelectorAll('.ok input:not([disabled])')];
  const key = 'media-review-' + document.querySelector('.meta').textContent.slice(0, 10);
  let saved = {{}};
  try {{ saved = JSON.parse(localStorage.getItem(key) || '{{}}'); }} catch {{}}
  const update = () => {{
    document.getElementById('progress').textContent = boxes.filter(b => b.checked).length + ' / ' + boxes.length + ' confirmed';
    try {{ localStorage.setItem(key, JSON.stringify(Object.fromEntries(boxes.map(b => [b.getAttribute('aria-label'), b.checked])))); }} catch {{}}
  }};
  boxes.forEach(b => {{ b.checked = !!saved[b.getAttribute('aria-label')]; b.addEventListener('change', update); }});
  update();
</script>
</body>
</html>
"""
    out = OUT / "review.html"
    out.write_text(page, encoding="utf-8")
    print(f"{out.relative_to(ROOT)}: {len(rows)} rows ({len(processed)} processed, {len(rows) - len(processed)} skipped), {out.stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    main()
