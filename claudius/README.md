# Claudius

Cost-smart **model-tier dispatcher** for Claude Code. Your main chat becomes a dispatcher: it sizes each coding task and hands the writing to the cheapest capable model, with a smart-model skeptic gate before anything merges.

- **Fable** — plans hard/ambiguous work, and runs the verify gate for **high-stakes** changes only.
- **Opus** — writes complex code (multi-file, new abstractions, security/auth/migrations/RLS) and is the **default verify gate** (Opus 5) — see [The verification gate](#the-verification-gate).
- **Sonnet** — writes standard code + is the default host.

Routing happens through **pinned-model subagents**, so it works even from a Sonnet-hosted chat. Cheap model on the many, expensive on the few.

## What it installs (global)

Into `~/.claude`:

- `agents/claudius-planner-fable`, `claudius-writer-opus`, `claudius-writer-sonnet`, `claudius-advisor-fable`, `claudius-advisor-opus`
- `skills/claudius-dispatch` (the always-on doctrine) + `skills/claudius-worktree-task` (chip lifecycle)
- an always-on doctrine block appended to `~/.claude/CLAUDE.md` between `<!-- claudius:start -->` / `:end` markers (surgical; leaves the rest untouched)
- `~/.claude/claudius/verify-model` — one word (`opus`/`fable`) selecting the standing verify-gate model (default `opus`)

## Venues

- **In-session subagents** — parallel fan-out for work you want now.
- **Chips** — a substantial task spun into its own chat + git worktree (`spawn_task` → `claudius-worktree-task`): worktree → plan → write → test → verify gate → **auto-merge to the working branch on green (never `main`)** → report, keep the chat. Run several in parallel while the main chat stays free.

## Install / uninstall

```
node install.mjs      # copy agents + skills, append the CLAUDE.md doctrine block
node uninstall.mjs     # remove them, strip the block
```

Idempotent. Restart Claude Code after either.

## Doctor + backups

Claudius **orchestrates** its dependencies; it never vendors or installs them. Each tool keeps its own installer and update path — Claudius owns the *map*, the *integration doctrine*, and a *health check*.

```
npm run doctor           # what this setup depends on, and whether it actually works
npm run doctor:updates   # + check upstream for addon updates and deploy drift (network)
npm run backup           # snapshot ~/.claude settings.json + CLAUDE.md
npm run backup:list      # show snapshots
```

`doctor.mjs` reads [`claudius.deps.json`](claudius.deps.json) — adding a dependency is a JSON edit, not a code change. It reports core tools, Claudius's own install state, RTK, and the roadmap items, with each tool's **native** fix command. Exit code is non-zero only when a *required* check fails; optional gaps are reported, never fatal.

Why it exists: nothing else records what this setup depends on or whether it's working. RTK printed `No hook installed` on every command for an entire session while the hook was registered and saving 31% — the doctor answers that in one line instead of an investigation.

### Staying current

`npm run doctor:updates` adds two things the base run skips (it needs the network, so it's opt-in):

- **Addon freshness.** Every Claude Code plugin marketplace that is a real git clone is fetched and compared to upstream, reporting `up to date` or `N commit(s) behind` with the fix command. The fetch uses each clone's standard refspec, so it updates remote-tracking refs only — it never moves your local branches. Note that Claude Code also refreshes marketplaces on its own, so these are usually already current; this tells you *when they aren't*. Non-clone marketplaces are reported as such, since they update through their own installer.
- **Deploy drift.** Claudius installs into `~/.claude` by copy, so the repo can drift ahead of what is actually live. This compares every installed agent, skill file, and the `CLAUDE.md` doctrine block against the repo (line-ending–insensitive) and names each drifted file. Fix is `node install.mjs`. This is the check that catches "I edited the repo and forgot to reinstall".

**Back up before running any third-party installer.** `rtk init -g`, `npx impeccable install`, and `npx claude-mem install` all write to files that also hold your other hooks and instructions. `npm run backup` keeps the newest 10 snapshots in `~/.claude/claudius/backups/<timestamp>/`; restore by copying a file back into `~/.claude/`.

## The verification gate

Every non-trivial change must get a `PASS` from a read-only skeptic before it counts as done or merged.

**Default: Opus 5** (`claudius-advisor-opus`). Opus 5 verifies at close to Fable quality for roughly half the cost, so it carries the routine load.

**Fable (`claudius-advisor-fable`) is reserved for changes that deserve it** — the doctrine escalates an individual task automatically when it is **Architectural**, or touches **security, auth, money, data migrations, or RLS**, or is otherwise hard to reverse. The standing setting is a **floor, not a ceiling**: Claudius escalates up on its own, never quietly down.

Change the standing setting anytime:

```
node verify-model.mjs status   # show current (default: opus)
node verify-model.mjs fable     # make Fable the standing gate
node verify-model.mjs opus      # back to Opus 5
```

Or just say it in chat — "use fable for verification" / "switch verification back to opus" — and Claude updates `~/.claude/claudius/verify-model`. The dispatch and worktree-task doctrine read that file at gate time. The setting persists across re-installs.

> Effort note: Claude Code subagent files pin the *model* but not a reasoning-effort level (Codex TOML has `model_reasoning_effort`; Claude `.md` frontmatter does not). To run the Opus 5 gate at xhigh/max effort, raise the session effort or run verification through the Workflow path (which sets per-call effort). The switch controls the model; effort is session-controlled.

## Token discipline — RTK (optional)

If [RTK](https://github.com/rtk-ai/rtk) is on PATH, Claudius routes **noisy command output** through it — test runs, typechecks, lint, builds, diffs, logs — typically 30–90% smaller. This compounds in Claudius specifically: work fans out to subagents, so every compressed test run saves context in the worker *and* in the summary that returns.

Wired into: both writer agents, both advisor agents, the dispatch doctrine, the chip lifecycle's test step, and the Codex companion.

Two deliberate limits:

- **Evidence stays raw.** A verify gate's `PASS`/`BLOCK` rests on real output, so compressing the evidence would undermine the gate. When an exact error, stack trace, or failure string matters, agents use `rtk proxy <cmd>` (unfiltered, still tracked) or RTK's tee file — and are told never to quote compressed output as verbatim.
- **Bash only.** RTK's hook rewrites Bash calls; native Read/Grep/Glob bypass it. Claudius does *not* push agents into the shell just to route through RTK — those tools are already efficient.

RTK is **optional**. If it's absent, agents run plain commands; nothing fails. `node install.mjs` reports whether `rtk` is on PATH and whether the `PreToolUse` hook is registered, but **never installs or reconfigures it** — `rtk init -g` rewrites your global `settings.json`, so that stays your call.

## Least code — ponytail (optional)

[ponytail](https://github.com/DietrichGebert/ponytail) is the **code-necessity** layer: a "laziness ladder" (does this need to exist → already in the codebase → stdlib → native → existing dependency → one-liner → only then minimum code) applied before code gets written.

It installs natively as a Claude Code plugin and its `SessionStart`/`SubagentStart` hooks reach Claudius writer subagents **automatically** — so Claudius deliberately does **not** restate the ladder in its own prompts (that would double the token cost and let two copies drift). Claudius owns only the interaction rule:

- **Minimal governs solution size, never correctness.** The ladder is no license to skip done-criteria, validation, error handling, or required tests.
- **The gate judges criteria, not volume.** A one-liner meeting every done-criterion is a `PASS`, not a `BLOCK` for "lacking structure". Both advisors carry this instruction.
- Least-code and adversarial-verify pull against each other *by design*: ponytail stops over-building, the gate stops under-building.

The three token layers are orthogonal — they cut different axes and compose:

| Layer | Cuts | Enforced by |
|---|---|---|
| **ponytail** | how much code gets written | plugin hooks (`SubagentStart` reaches subagents) |
| **RTK** | command output entering context | `PreToolUse` hook rewriting Bash |
| **caveman** | prose verbosity in replies | plugin + output style |

```
claude plugin marketplace add DietrichGebert/ponytail
claude plugin install ponytail@ponytail
```

Costs ~676 tok always-on. Skills: `/ponytail`, `-review`, `-audit`, `-debt`, `-gain`, `-help`.

## Codex companion

This repo also ships a Codex-native companion layer under `codex/`. It installs:

- `~/.codex/agents/codex-*.toml` custom agents for fast writing, standard writing, **strong writing**, fable-tier planning, and fable-tier review.
- `~/.codex/skills/codex-dispatch` and `~/.codex/skills/codex-hardening-pass`.
- a marker-delimited `Codex Claudius` block in `~/.codex/AGENTS.md`.

It keeps the same cost rule: cheap model on routine work, strongest available model for the planning and review gates, and a strong writer for Complex/Architectural work. Fable-tier substitute is `gpt-5.5` at `xhigh`.

> **⚠️ Model pinning is UNVERIFIED — treat this layer as experimental.** The published Codex docs say an agent-role file may set `model` / `model_reasoning_effort`, but inspecting the installed `codex.exe` (0.125.0) shows its agent-role deserializer expecting only ~3 fields (`name`, `description`, `developer_instructions`, `nickname_candidates`), with `model`/`sandbox_mode`/`model_reasoning_effort` appearing as *config-overlay* keys instead. If the inline keys are silently ignored, every Codex agent quietly falls back to session defaults and the cost/quality routing no-ops.
>
> **Verify before relying on it:** run one real Codex session, spawn `codex-reviewer-fable-tier`, and confirm it actually resolves at `gpt-5.5`/`xhigh`/read-only. If it doesn't, move those keys to the `[agents.<name>].config_file` overlay in `~/.codex/config.toml`. Note also that `sandbox_mode` is described as *legacy* in this build (the newer scheme is `sandbox` + `[permissions]`).

```
npm run install:codex      # install/update Codex companion
npm run uninstall:codex    # remove only Codex Claudius managed files/block
node codex/install.mjs --dry-run
node codex/uninstall.mjs --dry-run
```

Global hooks are not installed by default — automatic hooks add noise and cost. The opt-in source lives at `codex/hooks/hooks.json`; Codex consumes it via a plugin manifest (`"hooks": "./hooks.json"`), so wiring it up is a manual step, and Codex requires approving the hook per project.

## Roadmap (not in the global core)

- **per-project tuning** — complexity escalators (e.g. Supabase/RLS/migration/native/auth) + test gates appended to a project's CLAUDE.md.
- **Impeccable** — design-quality gate for UI tasks (`impeccable detect --json`, P1 blocks merge).
- **claude-mem** — optional shared memory layer (scoped trial first; needs Bun).

Design spec: [`docs/specs/2026-07-20-claudius-orchestrator-design.md`](docs/specs/2026-07-20-claudius-orchestrator-design.md).

Built from: claude-orchestrator, fable-advisor, the remio advisor/orchestrator writeup, and impeccable.
