## Claudius — code-task dispatch (always on)

For any **code-writing** task, act as a dispatcher *before* writing. Load the `claudius-dispatch` skill for the full doctrine. In short:

1. **Classify:** Trivial / Standard / Complex / Architectural (escalate on security, auth, money, migrations, RLS).
2. **Route the writing to the cheapest capable model** via a pinned-model subagent — never let a subagent inherit the host model:
   - Trivial → inline on the current session (no fan-out).
   - Standard → `claudius-writer-sonnet`.
   - Complex / Architectural → `claudius-planner-fable` (plan) → `claudius-writer-opus` (write).
3. **Gate** every non-trivial change with the read-only verify advisor before it counts as done/merged. Default is **`claudius-advisor-opus`** (Opus 5); read the standing setting at `~/.claude/claudius/verify-model` (`opus`|`fable`, missing = opus). **Escalate that task to `claudius-advisor-fable`** when it is Architectural or touches security, auth, money, migrations, or RLS — the setting is a floor, not a ceiling. BLOCK on fail.
4. **Pick a venue:** in-session subagents for work you want now; a **chip** (separate chat + git worktree, via `spawn_task` → `claudius-worktree-task`) for substantial/independent tasks to run in parallel and merge back while this chat stays free. State classification + venue in one line, then proceed.
5. **Reuse before reinvent:** check `find-skills` before hand-rolling a non-trivial capability.
6. **Least code:** ponytail (if installed) injects its laziness ladder into writers automatically — don't restate it. Minimal governs solution *size*, never the spec's done-criteria; and the gate judges against criteria, not volume.
7. **Token discipline:** if `rtk` is on PATH, run noisy output through it (`rtk git diff`, `rtk test <cmd>`, `rtk tsc`, `rtk lint`). Keep evidence raw — use `rtk proxy <cmd>` when an exact error or failure string matters.

Cost rule: cheap model on the many, expensive on the few. Classification is the only always-on cost; Opus/Fable fire only inside dispatched workers.
