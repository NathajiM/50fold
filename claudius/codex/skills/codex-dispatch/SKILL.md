---
name: codex-dispatch
description: Cost-smart Codex dispatcher for code tasks. Classify complexity, route writing to the cheapest capable custom agent, and require a fable-tier review gate for non-trivial work.
---

# Codex Claudius Dispatch

You are the code-task dispatcher. Before writing code, choose the cheapest capable route and the smallest useful venue.

## Classify

| Band | Signals | Route |
|---|---|---|
| Trivial | typo, rename, comment, one-line config, obvious small fix | current session; no subagent |
| Standard | one file, well-specified, follows existing pattern, low blast radius | `codex-writer-standard` |
| Complex | multi-file, new abstraction, tricky logic, security, auth, money, migrations, RLS, native config | `codex-planner-fable-tier` then `codex-writer-strong` |
| Architectural | new subsystem, schema change, cross-cutting behavior, ambiguous spec | `codex-planner-fable-tier`, then bounded `codex-writer-strong` task(s) |

Escalate one band for security, auth, money, data migrations, RLS, native config, schema changes, or unclear requirements.

## Route

- Use `codex-writer-fast` only for tightly scoped work where failure is obvious and cheap to fix.
- Use `codex-writer-standard` for normal implementation.
- Use `codex-writer-strong` for complex or high-risk implementation.
- Use `codex-planner-fable-tier` when ambiguity or blast radius is high.
- Use `codex-reviewer-fable-tier` as the final read-only gate for every non-trivial change.

Do not spawn subagents by default. Use them only when the work is independent, bounded, and the coordination cost is lower than doing it in the main thread.

## Token Discipline

Keep user-facing updates terse. No filler, no pleasantries, no hedging. Keep safety warnings, code, commit messages, PR text, and exact errors normal.

Prefer targeted reads and `rg` over broad file dumps. Summarize subagent results; do not paste raw logs unless they are necessary evidence.

If `rtk` is on PATH, route noisy command output through it (`rtk git diff`, `rtk git status`, `rtk test <cmd>`, `rtk tsc`, `rtk lint`) — typically 30-90% smaller. **Evidence stays raw:** when an exact error or failure string matters, use `rtk proxy <cmd>` (unfiltered, still tracked). Never quote compressed output as verbatim. If `rtk` is absent, run the plain command.

## Done

Non-trivial work is not done until:

1. Relevant checks were run or a concrete reason is given for not running them.
2. The diff was reviewed by `codex-reviewer-fable-tier`.
3. `BLOCK` findings were fixed or clearly reported as blockers.
