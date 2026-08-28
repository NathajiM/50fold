# 50fold

An AI cofounder plus nine C-suite agents that let a team of one to three people operate like a company of fifty.

## Proof

This is the exact workflow that took CourtMe (courtme.ai), an AI matchmaker for live events, from idea to shipped product with one person:

- V1 shipped in under 24 days: conversational voice intake, semantic matching at events of 100,000+ people, self-serve host onboarding.
- V2, a full always-on dating app reusing ~90% of the V1 build, reached code-complete in the same system, including payments, safety tooling, and 650+ row-level-security tests.
- Every non-trivial change passed an adversarial AI verification gate before merge. One real catch is documented in [docs/worked-example.md](docs/worked-example.md).

## Architecture

Two layers:

1. **Decision layer (`cofounder/`).** An orchestrator agent convenes only the specialist seats a question needs (3 to 6 is typical), forces a ranked answer instead of dumping options, and briefs the founder every morning from the roadmap.
2. **Execution layer (`claudius/`).** A model-tier dispatcher for the actual build work: classify each task, route it to the cheapest capable model, then gate the diff behind a read-only skeptic model that must return PASS before anything merges. Cheap model on the many, expensive on the few.

Full detail in [docs/architecture.md](docs/architecture.md).

## The nine seats

| Seat | Owns |
| --- | --- |
| CPO | Product scope, UX, activation, what to cut |
| CSO | Sales, partnerships, pipeline, close-or-kill |
| CMO | Marketing strategy, channel mix, budget (ships as a working plugin: `cofounder/plugins/cmo-seat/`) |
| CGO | Positioning, competitive picture, market wedge |
| COO | Execution discipline, founder time, vendors |
| CLO | Legal, compliance, contracts, liability |
| CFO | Burn, runway, unit economics, capital calls |
| CTO | Stack, AI architecture, build vs buy |
| CCO | Customer signal, support, the unfiltered user voice |

## The self-updating roadmap

`roadmap.md` is the orchestrator's ground truth: a phased checklist with statuses `[ ] [~] [x] [-]`. It updates from three directions: agents mark items as work merges, the daily briefing re-ranks the next unblocked items, and founder edits reprioritize everything downstream. `regen_roadmap.py` syncs the markdown to an HTML dashboard with structural validation. CourtMe's instance carried 500+ tasks across 28 phases.

## Run it

1. Copy `cofounder/company.template.md` to `company.md` and fill it in: product, market, targets, constraints.
2. Tune the nine seat mandates in `cofounder/roles/`.
3. Seed your roadmap from `cofounder/roadmap/roadmap.sample.md`.
4. Install the execution layer into Claude Code: `cd claudius && node install.mjs`.
5. Schedule the daily briefing (`cofounder/roadmap/daily-briefing.md`).

Talk to the orchestrator, not the seats. Ask it anything; it assembles the room.
