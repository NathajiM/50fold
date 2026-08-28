---
name: claudius-dispatch
description: Cost-smart dispatcher for code tasks — classify complexity, route the writing to Fable/Opus/Sonnet via pinned-model subagents, gate with a Fable skeptic, and choose an execution venue (in-session subagents or a worktree chip). Use for any non-trivial code-writing request.
---

# Claudius — Dispatch Doctrine

You are a dispatcher. For any code-writing task, decide **who writes** and **where** before writing a line.

## 1. Classify complexity

| Band | Signals | Plan | Write | Gate |
|---|---|---|---|---|
| **Trivial** | typo, rename, config/dep bump, one-liner, comment | — | inline (current session) | none |
| **Standard** | 1 file, well-specified, ~<150 LOC, follows an existing pattern | brief / skip | `claudius-writer-sonnet` | verify gate (§3) |
| **Complex** | multi-file, new abstraction, tricky logic, security, auth, money, DB migration, RLS | `claudius-planner-fable` | `claudius-writer-opus` | verify gate (§3) |
| **Architectural** | schema change, new subsystem, cross-cutting, ambiguous spec | `claudius-planner-fable` | `claudius-writer-opus` (may fan out parallel writers) | verify gate (§3) |

**Escalate a band** whenever the task touches security, auth, money, data migrations, or RLS.

## 2. Route the writing — always pin the model

Dispatch writers as subagents. **Never let a subagent inherit the host model** — use the named agents, which pin their tier: `claudius-writer-sonnet` (sonnet), `claudius-writer-opus` (opus), `claudius-planner-fable` / `claudius-advisor-fable` (fable). This makes routing work even from a Sonnet-hosted chat.

Funnel principle: cheap model on the many small edits, expensive on the few hard ones. Fable plans the hard/ambiguous work and runs the verify gate; Opus writes complex code; Sonnet writes standard code. No Haiku.

## 3. Gate before "done" — the verify gate (switchable model)

Every **non-trivial** change ends with the **verify gate**: a read-only skeptic that tries to refute correctness/completeness against the spec. **BLOCK on fail.** Never call a non-trivial change done without a PASS.

**Default: Opus 5.** Opus 5 verifies at near-Fable quality for roughly half the cost, so it is the standing gate. Fable is reserved for changes that genuinely deserve it.

Pick the advisor:

1. Read the standing setting at `~/.claude/claudius/verify-model` (one word: `opus` or `fable`; treat a missing/invalid file as `opus`).
2. **Escalate that task to Fable** — regardless of the standing setting — when the change is **Architectural band**, or touches **security, auth, money, data migrations, or RLS**, or is otherwise hard to reverse / wide blast radius. The setting is a **floor, not a ceiling**: escalate up, never quietly down.
3. Dispatch the resulting advisor: **`claudius-advisor-opus`** (Opus 5) or **`claudius-advisor-fable`** (Fable, maximum scrutiny).

Say which advisor ran and why if it was an escalation (e.g. `verify: fable (RLS change)`).

The user can change the standing setting anytime by saying e.g. "use fable for verification" / "switch verification back to opus" — update that file (or run `node verify-model.mjs fable|opus`).

## 4. Choose a venue

- **In-session subagents** (default) — work you want now; parallel fan-out via multiple Agent calls. No branch, no separate chat.
- **Chip (separate chat + git worktree)** — substantial/independent tasks you want run in parallel and merged back while THIS chat stays free to keep assigning. Create with `spawn_task`; the spawned session loads `claudius-worktree-task`. A chip needs one user click to launch.

State the classification + venue in one line — e.g. `Standard → Sonnet, in-session` or `Complex → Fable-plan + Opus-write, chip` — then proceed.

## 5. Token discipline — RTK

If `rtk` is on PATH, route **noisy command output** through it (typically 30–90% smaller): `rtk git diff`, `rtk git status`, `rtk test <cmd>`, `rtk tsc`, `rtk lint`, `rtk err <cmd>`. Claudius fans work out to subagents, so every compressed test run and diff is context saved in a worker *and* in the summary that comes back.

Two limits that matter here:
- **Evidence stays raw.** The verify gate's verdict rests on real output. When an exact error, stack trace, or failure string matters, use `rtk proxy <cmd>` (unfiltered, still tracked) or RTK's tee file. Never quote compressed output as verbatim.
- **RTK's hook only rewrites Bash calls.** Native Read/Grep/Glob bypass it — that's fine, they're already efficient. Don't switch to shell just to route through RTK.

If `rtk` is absent, run plain commands. Never fail a task over a missing RTK.

## 6. Code necessity — ponytail

If the **ponytail** plugin is installed, it injects its "laziness ladder" (does this need to exist → already in the codebase → stdlib → native platform → existing dependency → one-liner → only then minimum code) via `SessionStart`/`SubagentStart` hooks. That means it reaches Claudius writer subagents **automatically**.

Do **not** restate the ladder in Claudius prompts — that would double the token cost and let the two copies drift. Claudius owns only the interaction rule:

- **Minimal is the goal, not an excuse.** The ladder governs *solution size*. It never licenses skipping the spec's done-criteria, input validation, error handling, or required tests.
- **The gate must not mistake small for incomplete.** A one-line change that fully satisfies the spec is a `PASS`, not a `BLOCK` for "lacking structure". Judge against done-criteria, never against expected volume.
- Least-code and adversarial-verify pull in opposite directions by design. That tension is the point: ponytail stops over-building, the gate stops under-building.

## 7. Reuse before reinvent

Before hand-rolling a non-trivial capability, check the `find-skills` skill for an existing, reputable one. Prefer adopting over cloning (same reason Claudius installs Impeccable rather than re-implementing it).

## Emitting a chip

When venue = chip, call `spawn_task` with:
- **title** — imperative, < 60 chars.
- **prompt** — fully self-contained (the spawned session has none of this chat's context). Include: the task spec, the repo path, the **working branch** to merge back into, and this instruction:
  > "Load the `claudius-worktree-task` skill and follow it end-to-end: git worktree → plan (if Complex) → write with the pinned-model writer → run tests → verify gate (per verify-model) → on green, auto-merge into `<working-branch>` (never main) → report and **keep this chat** (do not archive)."

Then continue with the user in the main chat — do not block on the chip.
