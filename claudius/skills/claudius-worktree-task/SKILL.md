---
name: claudius-worktree-task
description: Lifecycle for a Claudius chip task running in its own session — create a git worktree, route the work to pinned-model subagents, verify with the Fable skeptic, auto-merge to the working branch on green gates, and report (keep the chat). Load this when a spawned/chip session is told to.
---

# Claudius — Worktree Task Lifecycle

You are a spawned worker session. Execute the assigned task end-to-end in isolation, then merge it back. Follow every step; report honestly; never fake a green result.

## 0. Read the assignment
Confirm you have: the **task spec**, the **repo path**, and the **working branch** to merge back into. If any is missing, ask once, then proceed.

## 1. Worktree
Create an isolated git worktree off the working branch:
```
git worktree add <repo>/.claude/worktrees/<slug> -b claudius/<slug> <working-branch>
```
Work only inside that worktree for the rest of the task.

## 2. Plan (Complex / Architectural only)
Dispatch `claudius-planner-fable` to produce a short spec + ordered todo list. Skip for Standard tasks.

## 3. Write — pinned model
Dispatch the writer by band: `claudius-writer-sonnet` (Standard) or `claudius-writer-opus` (Complex/Architectural), handing it the plan/spec. Architectural work may fan out parallel writers over independent units.

## 4. Test
Run the repo's real gates and capture the output. Discover them if unstated (package.json scripts, CI config). Typical: typecheck, unit tests, lint. Never claim a check passed without running it.

If `rtk` is on PATH, run them through it (`rtk test <cmd>`, `rtk tsc`, `rtk lint`) to keep output small. **On failure, re-run with `rtk proxy <cmd>` to get the exact error** before reporting or fixing — compressed output is a summary, not evidence.

## 5. Verify gate — skeptic (switchable model)
Read `~/.claude/claudius/verify-model` (one word `opus` or `fable`; treat missing/invalid as `opus`) and dispatch the matching advisor with the diff + spec: `claudius-advisor-opus` (Opus 5, the default) or `claudius-advisor-fable` (Fable).

**Escalate this task to Fable regardless of that setting** when the change is Architectural, or touches security, auth, money, data migrations, or RLS, or is hard to reverse. The setting is a floor, not a ceiling. Note which advisor ran in the report.
- `BLOCK` → fix (loop to step 3) or, if you can't, STOP and ping the user with the blockers. **Do not merge on a BLOCK.**
- `PASS` → continue.

## 6. Merge — auto, on green only
When advisor = `PASS` **and** tests/typecheck are green: merge the `claudius/<slug>` branch into the **working branch**. **Never merge to `main`/`master` unattended.** Then remove the worktree (`git worktree remove`). On ANY gate failure: stop, leave the worktree in place, ping.

## 7. Report — keep the chat
Post a summary: what merged, into which branch, gate results (verbatim), and any follow-ups. **Do NOT archive this chat** (user policy: merge auto, keep chat). Mention that archiving is available manually if they want it.
