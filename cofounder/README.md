# The Cofounder System (decision layer)

A multi-persona AI cofounder for a solo founder or 1-3 person team.

```
                     Founder
                        ▲
                        │ briefings, recommendations, decisions
                        │
              ┌─────────┴─────────┐
              │    Orchestrator   │  ← the only agent you talk to
              └─────────┬─────────┘
                        │
     ┌────┬────┬────┬───┼───┬────┬────┬────┐
    CPO  CSO  CMO  CGO COO CLO  CFO  CTO  CCO
```

The orchestrator synthesizes inputs from nine specialist seats and outputs a single, prioritized briefing. The founder talks to the orchestrator; the orchestrator manages the rest.

## Files

| File | Role | Owns |
| --- | --- | --- |
| `orchestrator.md` | Orchestrator | Synthesis, ranking, conflict resolution, founder-facing briefings |
| `roles/cpo.md` | Chief Product Officer | Roadmap, UX, activation, retention loops |
| `roles/cso.md` | Chief Sales Officer | Partnerships, pipeline, revenue deals |
| `roles/cmo.md` | Chief Marketing Officer | Strategy, channel mix, budget (execution ships as the `plugins/cmo-seat` plugin) |
| `roles/cgo.md` | Chief Growth/Strategy Officer | Positioning, competitive, market timing, wedge defense |
| `roles/coo.md` | Chief Operating Officer | Execution discipline, founder time, vendor mgmt |
| `roles/clo.md` | Chief Legal Officer | ToS, privacy, safety/liability, contracts |
| `roles/cfo.md` | Chief Financial Officer | Burn, runway, CAC/LTV, capital allocation |
| `roles/cto.md` | Chief Technology Officer | Tech stack, AI orchestration, build vs. buy |
| `roles/cco.md` | Chief Customer Officer | Customer feedback, support signal, reviews |
| `company.template.md` | Shared context | The one file every seat loads (copy to `company.md`, fill in) |
| `roadmap/` | Ground truth | Sequential launch checklist + HTML dashboard sync + daily-briefing cadence |

## Setup

1. `cp company.template.md company.md` and fill it in. This is the highest-leverage 20 minutes in the repo.
2. Skim each `roles/*.md` and edit the frameworks/targets marked `{{...}}` to your business.
3. Seed `roadmap/roadmap.md` from `roadmap/roadmap.sample.md`.
4. Load these files into your agent runtime of choice. With Claude Code: keep this directory in your project and tell the session "you are the orchestrator in cofounder/orchestrator.md". Personas are plain markdown; nothing here is runtime-specific.
5. Schedule the daily briefing (see `roadmap/daily-briefing.md`).

## How to use it

- **Talk to the orchestrator first.** Instead of "should I run this ad?", ask the orchestrator; it convenes CMO + CFO + CGO and returns one unified answer.
- **Bypass when you want depth.** "Read roles/cfo.md and review my burn" invokes a seat directly.
- **Edit the personas as the company evolves.** They are living docs. When priorities shift, update the mandates.

## Operating principles (all seats)

1. Concise > comprehensive. Bullets, numbers, decisions. No fluff.
2. Red-team yourself; surface counterarguments unprompted.
3. No yes-man behavior. Push back when the founder is wrong.
4. Anchor to the bull case in `company.md`.
5. Respect founder constraints in `company.md` without re-litigating them.
