"""
regen_roadmap.py - sync roadmap.html with roadmap.md

What it does:
  - Reads task statuses from roadmap.md:
      [x] = done           -> done: true    in HTML (green check, struck through)
      [-] = parked         -> parked: true  in HTML (amber "parked" tag, not actionable)
      [~] = in-progress    -> no flag (visible as active work)
      [ ] = not started    -> no flag
  - Updates done/parked flags in roadmap.html's STAGES data array to match
  - Auto-inserts MD tasks missing from the HTML into the best-matching card
  - Validates HTML structure BEFORE and AFTER writing (prevents truncation bugs)
  - Reports any tasks in HTML that aren't in MD (stale, may want to remove)

Usage:
  python regen_roadmap.py                       # normal run (siblings roadmap.md / roadmap.html)
  python regen_roadmap.py --md PATH --html PATH # run on staged copies

Both inputs are validated against truncation before anything is written:
roadmap.md must end with the EOF sentinel <!-- roadmap:eof -->, roadmap.html
must end with </html>. The HTML dashboard is optional; if you do not keep
one, roadmap.md alone is the system and this script is unused.
"""

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent
MD_PATH = ROOT / "roadmap.md"
HTML_PATH = ROOT / "roadmap.html"

GREEN = "\033[32m"
YELLOW = "\033[33m"
RED = "\033[31m"
DIM = "\033[2m"
RESET = "\033[0m"


# Task IDs: dotted numbers with an optional trailing letter (9.7.5b, 26.0a).
# A line may carry a RANGE ("22.1–22.20 (sequential: ...)"); the line is keyed
# by its LEADING id only -- one collapsed MD line == one collapsed HTML card item.
ID_RE = r"\d+(?:\.\d+)+[a-z]?"


def parse_md(md_text):
    tasks = {}
    pattern = re.compile(
        r"^\s*-\s*\[([x\-~ ])\]\s+(" + ID_RE + r")(?=[\s–—-]|$)",
        re.MULTILINE,
    )
    for state, tid in pattern.findall(md_text):
        if state == "x":
            tasks[tid] = "done"
        elif state == "-":
            tasks[tid] = "parked"
        elif state == "~":
            tasks[tid] = "progress"
        else:
            tasks[tid] = "todo"
    return tasks


def update_html(html_text, md_tasks):
    stats = {
        "updated_to_done": [],
        "updated_to_parked": [],
        "updated_to_undone": [],
        "unchanged": 0,
        "html_task_ids": set(),
        "no_id_items": 0,
    }

    item_pattern = re.compile(
        r'\{\s*text:\s*"((?:[^"\\]|\\.)*)"\s*(?:,\s*(done|parked):\s*(?:true|false))?\s*\}'
    )

    def repl(m):
        text = m.group(1)
        cur_flag = m.group(2)
        id_match = re.match(r"(" + ID_RE + r")", text)
        if not id_match:
            stats["no_id_items"] += 1
            return m.group(0)
        tid = id_match.group(1)
        stats["html_task_ids"].add(tid)
        if tid not in md_tasks:
            return m.group(0)
        md_state = md_tasks[tid]
        if md_state == "done":
            desired = "done"
        elif md_state == "parked":
            desired = "parked"
        else:
            desired = None
        if desired == cur_flag:
            stats["unchanged"] += 1
            return m.group(0)
        if desired == "done":
            stats["updated_to_done"].append(tid)
            return '{ text: "' + text + '", done: true }'
        elif desired == "parked":
            stats["updated_to_parked"].append(tid)
            return '{ text: "' + text + '", parked: true }'
        else:
            stats["updated_to_undone"].append(tid)
            return '{ text: "' + text + '" }'

    new_html = item_pattern.sub(repl, html_text)
    return new_html, stats


def parse_md_texts(md_text):
    texts = {}
    pattern = re.compile(
        r"^\s*-\s*\[[x\-~ ]\]\s+(" + ID_RE + r")"
        r"(?:\s*[–—-]\s*" + ID_RE + r")?"  # consume an id-range suffix
        r"\s*(.*\S)\s*$",
        re.MULTILINE,
    )
    for tid, desc in pattern.findall(md_text):
        texts[tid] = desc
    return texts


def _js_escape(s):
    return s.replace("\\", "\\\\").replace('"', '\\"')


def make_label(tid, desc):
    s = desc.replace("**", "").replace("`", "")
    s = re.sub(r"[✅⚠️\U0001F6AB→]", "", s)
    s = re.sub(r"\s+", " ", s).strip()
    label = tid + " " + s if not s.startswith(tid) else s
    if len(label) > 80:
        label = label[:79].rstrip(" -—") + "…"
    return label


def _id_tuple(s):
    key = []
    for x in s.split("."):
        m = re.match(r"(\d+)([a-z]?)$", x)
        if m:
            key.append((int(m.group(1)), m.group(2)))
        else:
            key.append((0, x))
    return key


def insert_missing_tasks(html_text, md_tasks, md_texts, missing_ids):
    if not missing_ids:
        return html_text, [], []

    lines = html_text.split("\n")
    item_line_re = re.compile(
        r'^(\s*)\{\s*text:\s*"((?:[^"\\]|\\.)*)"'
        r'(?:\s*,\s*(?:done|parked):\s*(?:true|false))?\s*\}\s*,?\s*$'
    )
    lead_id_re = re.compile(r"^(" + ID_RE + r")")

    blocks = []
    i, n = 0, len(lines)
    while i < n:
        m = item_line_re.match(lines[i])
        if m:
            start = i
            indent = m.group(1)
            ids, all_have_id = [], True
            while i < n:
                mm = item_line_re.match(lines[i])
                if not mm:
                    break
                idm = lead_id_re.match(mm.group(2))
                if idm:
                    ids.append(idm.group(1))
                else:
                    all_have_id = False
                i += 1
            blocks.append({"start": start, "end": i, "indent": indent,
                           "ids": ids, "all_have_id": all_have_id})
        else:
            i += 1

    assignments = {}
    unplaceable = []
    for mid in missing_ids:
        mseg = mid.split(".")
        best_bi, best_score = None, 0
        for bi, b in enumerate(blocks):
            for cid in b["ids"]:
                cseg = cid.split(".")
                shared = 0
                for a, c in zip(mseg, cseg):
                    if a == c:
                        shared += 1
                    else:
                        break
                if shared > best_score:
                    best_score, best_bi = shared, bi
        if best_bi is None or best_score < 1:
            unplaceable.append(mid)
        else:
            assignments.setdefault(best_bi, []).append(mid)

    inserted = []
    new_lines = lines[:]
    for bi in sorted(assignments, reverse=True):
        b = blocks[bi]
        new_pairs = []
        for mid in sorted(assignments[bi], key=_id_tuple):
            label = make_label(mid, md_texts.get(mid, mid))
            state = md_tasks.get(mid)
            if state == "done":
                flag = ", done: true"
            elif state == "parked":
                flag = ", parked: true"
            else:
                flag = ""
            line = (b["indent"] + '{ text: "' + _js_escape(label) + '"'
                    + flag + " },")
            new_pairs.append((mid, line))
            inserted.append(mid)
        existing = new_lines[b["start"]:b["end"]]
        if b["all_have_id"]:
            pairs = []
            for ln in existing:
                idm = lead_id_re.match(item_line_re.match(ln).group(2))
                pairs.append((idm.group(1), ln))
            pairs.extend(new_pairs)
            pairs.sort(key=lambda t: _id_tuple(t[0]))
            merged = [ln for _, ln in pairs]
        else:
            merged = existing + [ln for _, ln in new_pairs]
        new_lines[b["start"]:b["end"]] = merged

    return "\n".join(new_lines), inserted, unplaceable


MD_EOF_SENTINEL = "<!-- roadmap:eof -->"


def validate_md_structure(md_text):
    """Truncation guard: roadmap.md must end with the EOF sentinel line."""
    if MD_EOF_SENTINEL not in md_text.rstrip()[-200:]:
        return [
            "missing EOF sentinel '" + MD_EOF_SENTINEL + "' at end of file "
            "(likely a truncated copy - e.g. the Cowork sandbox mount). "
            "Refusing to proceed: syncing from a truncated MD would corrupt the HTML."
        ]
    return []


def validate_html_structure(html_text):
    problems = []
    for tag in ("</script>", "</body>", "</html>"):
        if tag not in html_text:
            problems.append("missing closing tag: " + tag)
    if not html_text.rstrip().endswith("</html>"):
        problems.append("file does not end with </html> (likely truncated)")
    if "const STAGES" not in html_text:
        problems.append("STAGES array not found in script block")
    return problems


def main():
    ap = argparse.ArgumentParser(
        description="Sync roadmap.html done/parked flags from roadmap.md checkboxes."
    )
    ap.add_argument("--md", default=str(MD_PATH),
                    help="path to roadmap.md (default: alongside this script)")
    ap.add_argument("--html", default=str(HTML_PATH),
                    help="path to roadmap.html (default: alongside this script)")
    args = ap.parse_args()
    md_path = Path(args.md)
    html_path = Path(args.html)

    if not md_path.exists():
        print(RED + "ERROR" + RESET + ": " + str(md_path) + " not found")
        return 1
    if not html_path.exists():
        print(RED + "ERROR" + RESET + ": " + str(html_path) + " not found")
        return 1

    md_text = md_path.read_text(encoding="utf-8")
    html_text = html_path.read_text(encoding="utf-8")

    md_problems = validate_md_structure(md_text)
    if md_problems:
        print(RED + "ABORT" + RESET + ": roadmap.md failed validation - refusing to proceed.")
        for p in md_problems:
            print("    - " + p)
        return 2

    pre_problems = validate_html_structure(html_text)
    if pre_problems:
        print(RED + "ABORT" + RESET + ": roadmap.html is structurally broken - refusing to write.")
        for p in pre_problems:
            print("    - " + p)
        return 2

    md_tasks = parse_md(md_text)
    md_texts = parse_md_texts(md_text)
    new_html, stats = update_html(html_text, md_tasks)

    md_ids = set(md_tasks.keys())
    html_ids = stats["html_task_ids"]
    missing_from_html = sorted(md_ids - html_ids, key=_id_tuple)

    new_html, inserted, unplaceable = insert_missing_tasks(
        new_html, md_tasks, md_texts, missing_from_html
    )

    missing_from_md = sorted(html_ids - md_ids, key=_id_tuple)

    changed = new_html != html_text

    if changed:
        post_problems = validate_html_structure(new_html)
        if post_problems:
            print(RED + "ABORT" + RESET + ": post-substitution HTML failed validation - NOT writing.")
            for p in post_problems:
                print("    - " + p)
            return 3
        html_path.write_text(new_html, encoding="utf-8")

    print()
    print(DIM + "roadmap.md -> roadmap.html" + RESET)
    print("  MD tasks parsed:   " + str(len(md_tasks)))
    print("  HTML items found:  " + str(len(html_ids)))
    print()

    if stats["updated_to_done"]:
        print(GREEN + "+ Flipped to DONE (" + str(len(stats["updated_to_done"])) + "):" + RESET)
        for t in stats["updated_to_done"]:
            print("    " + t)
    if stats["updated_to_parked"]:
        print(DIM + "- Flipped to PARKED (" + str(len(stats["updated_to_parked"])) + "):" + RESET)
        for t in stats["updated_to_parked"]:
            print("    " + t)
    if stats["updated_to_undone"]:
        print(YELLOW + "~ Flipped to ACTIVE (" + str(len(stats["updated_to_undone"])) + "):" + RESET)
        for t in stats["updated_to_undone"]:
            print("    " + t)
    if not any([stats["updated_to_done"], stats["updated_to_parked"], stats["updated_to_undone"]]):
        print(GREEN + "OK" + RESET + " - no status changes needed (" + str(stats["unchanged"]) + " items in sync)")

    if inserted:
        print()
        print(GREEN + "+ Auto-inserted into HTML (" + str(len(inserted)) + "):" + RESET)
        for t in sorted(inserted, key=_id_tuple):
            print("    " + t + "  (" + md_tasks[t] + ")")

    if unplaceable:
        print()
        print(YELLOW + "WARN: " + str(len(unplaceable)) + " tasks in MD have no matching card:" + RESET)
        for t in unplaceable:
            print("    " + t + "  (" + md_tasks[t] + ")")

    if missing_from_md:
        print()
        print(YELLOW + "WARN: " + str(len(missing_from_md)) + " tasks in HTML but not in MD (stale):" + RESET)
        for t in missing_from_md:
            print("    " + t)

    print()
    if changed:
        print(GREEN + "WROTE" + RESET + " roadmap.html  " + DIM + "(validation passed)" + RESET)
    else:
        print(DIM + "no write - file unchanged" + RESET)

    return 0


if __name__ == "__main__":
    sys.exit(main())
