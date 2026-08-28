# Claudius — Orchestrator/Advisor Design

**Date:** 2026-07-20
**Status:** Approved (design); pending spec review → implementation plan
**Scope:** Global Claude Code tooling (`~/.claude`) + `your-app` / `your-landing-page` tuning + **Impeccable** design-quality layer (global skill + all UI projects)
**Author:** Founder + Claude

---

## 1. Goal

An always-on, cost-smart orchestration layer for **code writing** across all Claude Code
use (the flagship app first). The main chat becomes a **dispatcher**: it classifies each coding
task, routes the work to the right model tier, and pushes substantial tasks into
**isolated parallel venues** (chips → separate chat + worktree, or in-session subagents)
so the main chat stays free to keep assigning while several tasks run at once.

Distilled from four sources:
- `gsalami/claude-orchestrator` — Fable-as-tech-lead decomposes → dispatches to
  Opus/Sonnet workers + a challenger.
- `DannyMac180/fable-advisor` — "smartest model runs the show, cheaper models do the
  typing"; read-only skeptic advisor at decision points; spec contract for context-free
  delegation.
- remio.ai two-pattern writeup — **Advisor** (cheap session escalates UP to expensive
  model at verification points; ~92% of Fable accuracy at ~63% cost on SWE-bench Pro)
  vs **Orchestrator** (expensive lead decomposes DOWN to cheap workers; ~96% at ~46%
  cost on BrowseComp). Advisor wins for coding; Orchestrator wins for decomposable work.
- `pbakaus/impeccable` (48k★, Apache-2.0, maintained) — frontend **design-quality** layer:
  a deterministic 46-rule anti-pattern detector + `/impeccable` commands + a post-UI-edit
  hook. Adds the design axis the other three lack.

This design **fuses all four**: advisor-style escalation for verification +
orchestrator-style decomposition for large tasks, over a shared 3-tier model palette,
with Impeccable as the **design-quality gate** on UI work (§6a).

## 2. Model tiers & roles

| Tier | Model id | Role |
|---|---|---|
| **Fable** | `claude-fable-5` | Architect-planner (hard/ambiguous) **and** advisor/verifier — the skeptic merge gate. Aligns with the flagship app's existing "Fable subagent + ground-truth" protocol (`your-app/CLAUDE.md:47`). |
| **Opus** | `claude-opus-4-8` | Senior writer (complex code) + mid-tier planner. |
| **Sonnet** | `claude-sonnet-5` | Fast writer (standard/simple code) + default host/session model. |

Routing is realized through **pinned-model subagents** (`model: fable\|opus\|sonnet` on the
Agent tool / agent-def frontmatter / Workflow `agent()` call). This is the load-bearing
mechanism: it makes tier selection work **regardless of the host chat's model** — a
Sonnet-hosted chip can still dispatch a Fable planner and an Opus writer. the flagship app already
runs Fable subagents, confirming Fable pinning is available on this plan.

Haiku is intentionally excluded (user directive: writing is Opus or Sonnet only).

## 3. Complexity rubric → routing

The lead classifies **every** code task into one of four bands:

| Band | Signals | Plan | Write | Gate |
|---|---|---|---|---|
| **Trivial** | typo, rename, config/dep bump, one-liner, comment | — | inline **Sonnet** | none |
| **Standard** | 1 file, well-specified, ~<150 LOC, follows an existing pattern | skip / brief | **Sonnet** | Fable |
| **Complex** | multi-file, new abstraction, tricky logic, security-sensitive, **RN native / Supabase / RLS / DB migration** | Opus or **Fable** | **Opus** | Fable |
| **Architectural** | schema change, new subsystem, cross-cutting, ambiguous spec | **Fable** | **Opus** (may split into parallel Opus/Sonnet writers) | Fable |

**Rule:** every **non-trivial** task ends with a **Fable advisor verify gate** before merge.
Funnel principle (inherited from the sources): cheap model on the many small edits,
expensive model on the few hard ones; the smartest model plans and judges, never types
the boilerplate.

**the flagship app-specific escalators** (bump a task up a band): anything touching
`supabase/`, RLS policies, DB migrations, `eas.json`/native config, auth, payments, or
the v2 event schema → **minimum Complex** (Opus write + Fable gate).

**UI/design signal** (orthogonal to band): any task that touches rendered UI —
components, styles/CSS, layout, theming, copy-in-UI, animation — additionally triggers
the **Impeccable design gate** (§6a) on top of its band's model routing + Fable gate.
Pure design-polish requests (`/impeccable polish|bolder|quieter|distill`, "make it look
better") route as Standard/Complex by surface size and run Impeccable as the primary gate.

## 4. Venues

Two execution venues; the lead recommends one, user can override.

**A. Subagent (in-session)** — default for work you want done now without its own branch.
- Parallel fan-out via multiple Agent calls or the optional `orchestrate-code` Workflow.
- No click, no separate chat, no worktree. Results land in the current session.
- Best for: bundles of small/standard edits, research, quick complex fixes.

**B. Chip (separate chat + worktree)** — for substantial/independent tasks run in parallel
isolation, off the main chat's plate.
- Created via `spawn_task` (a chip). **Requires one user click** to spin off the separate
  session — this is a platform constraint and is kept deliberately (you control parallel
  spend). The chip's prompt is fully self-contained (see §5).
- Best for: independent features, refactors, anything you want merged back autonomously
  while you keep assigning other work.

## 5. Chip task lifecycle

Encoded in the `worktree-task` skill that the **spawned** session auto-loads. Steps:

1. **Worktree** — create a git worktree off the *current working branch* (native worktree
   tool / `git worktree add`), isolated dir under the repo's `.claude/worktrees/`.
2. **Plan** — Fable or Opus (by band) writes a short spec + todo list into the worktree.
3. **Write** — dispatch pinned-model writer subagent(s): Opus (complex) / Sonnet (standard).
   Architectural tasks may fan out parallel writers.
4. **Test** — run the repo's gates. the flagship app: `npm run typecheck`, `vitest run tests/unit`,
   `test:rls`, and `test:evals` when touched. Landing page: build/lint as applicable.
5. **Fable verify gate** — read-only Fable advisor adversarially reviews the diff vs the
   spec + ground truth. **Blocks merge on fail**; on fail the worker stops and pings.
5b. **Impeccable design gate** (UI tasks only) — run `npx impeccable detect <changed UI
   paths> --json` (deterministic, no LLM). **Any unresolved P1 (critical) finding blocks
   auto-merge**; P2/P3 are surfaced in the report but non-blocking (advisory). The
   real-time detector hook already ran during edits; this is the pre-merge enforcement
   pass. For deeper nuance the worker may run `/impeccable critique` (LLM) but only the
   deterministic P1 set gates the merge.
6. **Merge** — on all-green gates (**tests + typecheck + Fable verify + Impeccable P1**),
   merge the worktree into the **working branch** (**never `main`/`master` unattended**).
   Remove the worktree.
7. **Report + keep chat** — post a summary of what merged, gate results, and the branch.
   **Do NOT auto-archive** (user policy: "merge auto, keep chat"). The chat is left open
   for inspection; archiving is offered as a manual one-liner (`archive_session`).

**Merge policy (approved):** auto-merge to working branch when Fable verify + typecheck +
tests all pass; keep the chat; stop-and-ping on any gate failure. main is never touched
without an explicit human go.

## 6. Components & repo layout

Delivered as a self-contained, version-controlled unit that **installs into `~/.claude`**
(mirrors how career-ops is a standalone repo). Install = copy/symlink + a surgical
CLAUDE.md block; idempotent and reversible.

```
claude-dispatch/                     # this repo (git-init'd)
├─ docs/specs/2026-07-20-...-design.md
├─ agents/
│  ├─ planner-fable.md               # model: fable  — architect/plan (hard)
│  ├─ writer-opus.md                 # model: opus   — complex code
│  ├─ writer-sonnet.md               # model: sonnet — standard code
│  └─ advisor-fable.md               # model: fable  — read-only skeptic verify gate
├─ skills/
│  ├─ dispatch/SKILL.md              # always-on doctrine: classify → tier + venue → emit chip
│  └─ worktree-task/SKILL.md         # spawned-session lifecycle (§5)
├─ workflows/
│  └─ orchestrate-code.js            # OPTIONAL in-session fan-out, dynamic per-call model routing
├─ the flagship app/
│  └─ dispatch-tuning.md             # block appended to your-app/CLAUDE.md (complexity escalators + test gates)
├─ CLAUDE.dispatch-block.md          # compact always-on block appended to ~/.claude/CLAUDE.md
├─ install.mjs                       # idempotent installer (copies agents/skills, appends blocks w/ markers)
└─ uninstall.mjs                     # removes installed files + marked blocks
```

**Install targets**
- `~/.claude/agents/*.md` ← the four agent defs.
- `~/.claude/skills/{dispatch,worktree-task}/` ← the two skills.
- `~/.claude/CLAUDE.md` ← append a compact **Claudius doctrine** block between
  `<!-- claude-dispatch:start -->` / `:end` markers (surgical; preserves the existing
  caveman + CodeGraph + memory content).
- `your-app/CLAUDE.md` ← append the flagship app tuning block between the same markers.
- Optional Workflow saved to `~/.claude/workflows/orchestrate-code.js`.

## 6a. Impeccable integration

Impeccable is **installed natively** (not vendored/reinvented) and Claudius **wires into
it**. It is a mature, maintained, Apache-2.0 tool — Claudius treats it as the design-gate
dependency.

**Install (global + all UI projects)**
- Global: install the `/impeccable` skill + commands so any project can call them, and add
  the design-quality guidance to `~/.claude`.
- Per UI project (`your-app`, `your-landing-page`, + any future UI repo): run
  `npx impeccable install`, select the Claude Code provider, then `/impeccable init` to
  seed `PRODUCT.md` + `DESIGN.md` (audience, brand, voice, colors, type) — reuse
  your-landing-page's existing brand assets (`mockups.css`, demos) as init input.
- This writes provider hooks (`.claude/settings.local.json`) + `.impeccable/config.json`.
  Because that is persistent-config modification running a third-party CLI, the installer
  step **requires explicit user approval at build time** (see §8) and is a documented,
  reversible step — Claudius's own `install.mjs` shells out to it, it does not re-implement it.

**Wiring (what Claudius adds on top of the native tool)**
- `worktree-task` lifecycle gains step **5b** (§5): `impeccable detect --json` P1 gate
  before auto-merge on UI tasks.
- `dispatch` doctrine learns the **UI/design signal** (§3): route design-polish requests
  and flag any UI-touching task so the Impeccable gate is applied.
- The native **post-edit hook stays advisory** (surfaces findings in real time, never
  blocks an edit); enforcement happens only at the merge P1 gate.
- "Add Impeccable to a new UI project" is a one-line documented step in the `dispatch`
  skill so coverage stays global as new UI repos appear.

**Coverage caveat (documented, not hidden):** the deterministic detector is web/CSS
oriented. `your-app`'s React Native `StyleSheet` screens get only **partial** rule
coverage; the LLM `/impeccable critique|polish` commands still apply there. The gate is
most authoritative on `your-landing-page` (static HTML/CSS) and the your-app **web**
surface.

## 6b. Memory layer — claude-mem (scoped trial, NOT global yet)

`thedotmack/claude-mem` (88k★, Apache-2.0, v13.11.0) is a cross-session memory system:
SQLite+FTS5 + Chroma vector search + a Bun worker HTTP service + 5 lifecycle hooks
(SessionStart auto-injects prior context; PostToolUse captures observations; Stop/
SessionEnd compress to summaries) + a `mem-search` skill.

**Why it's relevant to Claudius:** the single biggest weakness of the chip/subagent venues
is that spawned chats + worktrees **lose the main chat's context**. claude-mem's
auto-injected cross-session memory directly mitigates that — a chip could pick up project
history without a hand-carried prompt. If it proves out, it becomes Claudius's **shared
memory layer**.

**Decision (approved): scoped trial in `your-app` first — do NOT global-install.** Reasons:
- **Overlaps the existing file-memory** (`~/.claude/projects/.../memory/*.md` + `MEMORY.md`,
  already auto-injected). Two memory systems = redundancy; the trial decides which wins or
  whether they layer (curated `MEMORY.md` on top, claude-mem for raw project history).
- **Windows footprint risk:** Bun worker + Chroma(uv/Python) background service is the
  fragile stack on win32. Trial measures real overhead (`PostToolUse` fires every tool
  call) before committing globally.

**Prerequisite (BLOCKER):** environment has node v24 ✓, uv 0.11 ✓, python 3.10 ✓, but
**Bun is MISSING**. claude-mem needs Bun → install Bun before the trial (pending user go;
installing a system runtime is its own approval).

**Trial exit criteria** (decide global-adopt / drop / layer): acceptable per-action latency
on Windows, no worker crashes over a the flagship app session, retrieved context is actually useful
in a chip, and no conflict with the file-memory injection. Privacy: local-only SQLite;
wrap sensitive content in `<private>` tags. Out of scope for career-ops.

## 7. Always-on dispatch doctrine (the CLAUDE.md block)

Compact, cheap to evaluate every turn. Substance:
- When a user message assigns a **code-writing** task, before writing: classify band (§3),
  pick venue (§4), state the choice in one line, proceed.
- Trivial → inline Sonnet. Non-trivial → route via pinned-model subagents; end with Fable
  gate.
- Prefer a **chip** when the task is independent and substantial and the user is likely to
  assign more in parallel; prefer **subagents** when they want it now in-session.
- Never let subagents inherit the host model — always pin.
- Classification is cheap (the only always-on cost); expensive models fire **only** inside
  dispatched workers.
- **Reuse before reinvent:** before hand-rolling a non-trivial new capability, check for an
  existing skill via the **`find-skills`** skill (skills.sh; installed globally). Prefer a
  reputable existing skill over bespoke code — same ethic that installs Impeccable instead
  of cloning it. Vet any candidate (source + install count) before adopting.

## 8. Constraints, non-goals, risks

**Constraints (surfaced, not hidden)**
- Chips need 1 user click to launch a separate chat (can't fully auto-spawn a background
  chat). Mitigation: fully-specified chip prompts; nothing else needed after the click.
- A spawned chat has one host model; tier routing is guaranteed only via pinned subagents.
- Auto-merge is real git mutation — gated behind Fable verify + green tests, working branch
  only, worktree isolation limits blast radius.
- Installing Impeccable runs a third-party CLI (`npx impeccable install`) and writes
  provider hooks + `.impeccable/` config → **explicit user approval required** at build
  time; reversible; version pinned in Claudius's installer.

**Non-goals**
- No cross-vendor lanes (Codex/Grok) in v1 — Claude-only. (Hook left open for later.)
- Not applied to career-ops (explicitly out of scope; no UI, no design gate).
- No Haiku tier.
- Do **not** re-implement Impeccable's detector — install and wire the real tool.
- Full RN-native design coverage is not a v1 goal (detector is web/CSS; partial on RN).

**Risks & mitigations**
- *Runaway Opus/Fable spend* → funnel rubric defaults most edits to Sonnet; Fable only
  plans hard tasks + gates; always-on cost is just classification.
- *Bad auto-merge* → verify gate + tests + working-branch-only + easy revert (worktree).
- *CLAUDE.md clobber* → marker-delimited append, idempotent installer, uninstaller.
- *Skill/agent drift vs the flagship app's existing protocol* → tuning block reuses the flagship app's Fable
  ground-truth gate rather than replacing it.
- *Impeccable hook noise / token cost* → hook kept **advisory** (never blocks edits); only
  the deterministic **P1** set gates merges; P2/P3 advisory-only.
- *Impeccable version drift breaking the gate* → pin the version Claudius installs; upgrade
  deliberately, re-run the gate smoke test (§10) after bumps.

## 9. Phased build (maps to implementation plan)

- **Phase 1 — Routing core:** the four agent defs + `dispatch` skill + `~/.claude/CLAUDE.md`
  doctrine block + installer. Delivers tier routing + in-session subagent dispatch
  immediately. Verifiable in isolation.
- **Phase 2 — Chip lifecycle:** `worktree-task` skill (worktree→route→verify→merge→report,
  keep chat) + `dispatch` skill's chip-emission path. Delivers parallel isolated tasks.
- **Phase 3 — the flagship app tuning:** escalators + test gates block appended to
  `your-app/CLAUDE.md`; align with existing sprint verify protocol.
- **Phase 4 — Impeccable:** native `npx impeccable install` (global + the flagship app UI projects,
  with explicit approval) + `/impeccable init` seeding + wire the §5 step-5b P1 gate + the
  §3 UI signal into the `dispatch`/`worktree-task` skills. Depends on Phase 2.
- **Phase 5 (optional) — Workflow:** `orchestrate-code.js` for deterministic in-session
  fan-out with dynamic per-call model routing + `isolation:'worktree'`.
- **Phase 6 (parallel track) — claude-mem trial:** install Bun → `npx claude-mem install`
  scoped to `your-app` → run a real session → evaluate against §6b exit criteria →
  decide global-adopt-as-memory-layer / layer-with-file-memory / drop. Independent of
  Phases 1–5; does not block them.

**Already done (this session):** `find-skills` installed globally + wired into the §7
doctrine (reuse-before-reinvent). No further build needed — just referenced by the skill.

## 10. Verifying the system itself

- Installer idempotency: run twice → no duplicate blocks (marker check).
- Routing smoke test: three sample tasks (trivial/standard/complex) → confirm the lead
  picks Sonnet-inline / Sonnet+gate / Opus+gate respectively.
- Chip dry-run in the flagship app: a throwaway standard task → worktree created, Sonnet writes,
  Fable gate runs, merges to a scratch branch, chat kept. Confirm no `main` mutation.
- Impeccable gate test: seed a deliberate P1 anti-pattern (e.g. gray-on-color text) in a
  landing-page scratch file → `impeccable detect --json` reports P1 → chip auto-merge is
  **blocked**; fix it → gate passes → merge proceeds. Confirm P2/P3 do **not** block.
- Uninstall restores `~/.claude/CLAUDE.md` and `your-app/CLAUDE.md` to pre-install byte
  content (minus markers); Impeccable removed via its own uninstall path.
