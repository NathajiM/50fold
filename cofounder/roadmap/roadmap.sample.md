# {{COMPANY}} — AI Launch Roadmap (sample)

> **Orchestrator's source of truth.** This is a trimmed sample showing the format. A real instance runs 20-30 phases and hundreds of items (CourtMe's carried 500+ tasks across 28 phases). Statuses: `[ ]` open · `[~]` in progress · `[x]` done · `[-]` parked/deferred by design.
>
> **Conventions the tooling relies on:**
> - Every task line is `- [state] ID — description`, where ID is a dotted number with an optional letter (`1.2`, `9.7.5b`).
> - Phases are `##` headers. Dependencies and parallel tracks are stated in prose under the phase header; the orchestrator reads them when walking the file.
> - The file must end with the EOF sentinel line (truncation guard for `regen_roadmap.py`).
>
> **How it self-updates:** (1) when dispatched work merges, the executing agent flips the item to `[x]`; (2) the daily briefing walks the file and re-ranks the next unblocked items; (3) founder edits (add, park, reorder) reprioritize everything downstream on the next walk. No separate project tracker.

## Version ladder (product releases)

| Version | What it is | Phases | Status |
|---|---|---|---|
| **v1** | Lead build — the wedge product that real users touch first | 1-2 | `[~]` in progress |
| **v2** | The full product, reusing the v1 primitives | 3+ | not started |

## Phase 1 — Foundations

> No dependencies. Runs parallel with Phase 2 from item 1.4 onward.

- [x] 1.1 — Lock mission + anti-positioning in `company.md`
- [x] 1.2 — Define activation event + load-bearing metric; instrument both
- [x] 1.3 — Stand up auth, profiles, and the core data model
- [~] 1.4 — Build the AI matching/orchestration core (the moat; CTO owns, dispatch via claudius)
- [ ] 1.5 — Safety + trust baseline: reporting, blocking, moderation policy (CLO gate before ship)
- [ ] 1.6 — RLS / access-control test suite green end to end (verify-gate escalation: security)

## Phase 2 — Launch-market GTM

> Depends on 1.2. Items 2.1-2.3 run parallel.

- [x] 2.1 — Partner/host program: 10 partners → first 100 qualified signups
- [~] 2.2 — Paid channel test: 3-creative minimum, kill/scale rules pre-registered (CMO → cmo-seat plugin)
- [ ] 2.3 — Lifecycle messaging: welcome → activation nudge → post-activation feedback
- [ ] 2.4 — First press push, launch-market only (brand-pr skill; CLO reviews claims)
- [-] 2.5 — Second-market scouting (parked: P1 exit criteria not met)

<!-- roadmap:eof -->
