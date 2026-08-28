<!-- codex-claudius:start -->
## Codex Claudius

Be brief, professional, pragmatic. Default to token-saving output: no filler, no pleasantries, no hedging. Keep code, security warnings, irreversible-action confirmations, PR text, and commit messages normal.

For code-writing tasks, classify before writing:
- Trivial: current session, no subagent.
- Standard: route to `codex-writer-standard`.
- Complex or architectural: plan with `codex-planner-fable-tier`, then write with `codex-writer-strong`.
- Non-trivial changes require `codex-reviewer-fable-tier` read-only review before "done".

Token discipline: if `rtk` is on PATH, run noisy output through it (`rtk git diff`, `rtk test <cmd>`, `rtk tsc`, `rtk lint`). Keep evidence raw — use `rtk proxy <cmd>` when an exact error string matters.

Escalate to complex for security, auth, money, data migrations, RLS, native config, schema changes, or unclear requirements.

Use subagents only for bounded independent work. Prefer one writer plus one final reviewer over many parallel writers unless work naturally splits.
<!-- codex-claudius:end -->
