---
name: codex-hardening-pass
description: Final hardening workflow for Codex changes. Run checks, summarize the diff, and invoke the fable-tier read-only reviewer before calling work done.
---

# Codex Hardening Pass

Use this before calling any non-trivial code change done.

## Steps

1. Inspect the changed files and summarize intent in one sentence.
2. Run the repo's relevant deterministic checks: typecheck, lint, unit tests, focused integration tests, build, or the closest available equivalents.
3. Capture failures exactly enough to fix them; avoid dumping full logs unless needed.
4. Ask `codex-reviewer-fable-tier` to review the diff against the task and checks.
5. Treat `BLOCK` as not done. Fix and repeat, or report the blockers clearly.
6. Treat `PASS` plus green checks as done.

## Reviewer Prompt Shape

Send the reviewer:

- Original task.
- Files changed.
- Diff summary or actual diff when manageable.
- Checks run and real outcomes.
- Known constraints or skipped checks.

Reviewer must return `PASS` or `BLOCK`. Default to `BLOCK` when evidence is insufficient.

## Output

Final user response should be short:

- What changed.
- Verification result.
- Any unresolved risk or skipped check.
