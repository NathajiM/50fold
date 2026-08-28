# Architecture

50fold is two layers with one contract between them: the decision layer produces specs and priorities; the execution layer turns specs into merged, verified code.

```
                        Founder
                          ▲
                          │ briefings, decisions, vetoes
                          │
              ┌───────────┴───────────┐
              │      Orchestrator      │   LAYER 1 — DECISION
              │     (AI cofounder)     │   cofounder/
              └───────────┬───────────┘
        ┌────┬────┬────┬──┼──┬────┬────┬────┐
       CPO  CSO  CMO  CGO │ COO  CLO  CFO  CTO  CCO
                          │
                 roadmap.md (ground truth)
                          │
                          ▼ specs, done-criteria
              ┌───────────────────────┐
              │      Dispatcher        │   LAYER 2 — EXECUTION
              │      (Claudius)        │   claudius/
              └───────────┬───────────┘
        classify → route to model tier → write → test
                          │
                          ▼
              ┌───────────────────────┐
              │  Verification gate     │  read-only skeptic model
              │  PASS / BLOCK          │  BLOCK = it does not merge
              └───────────────────────┘
```

## Layer 1 — decision (cofounder/)

- **Orchestrator** (`orchestrator.md`): the only agent the founder talks to. For any request it infers which seats have a real stake, convenes 3 to 6 of them, has each give a 1-2 line position from its own mandate file, then force-ranks, resolves conflicts itself, and surfaces at most one founder-only decision. It names who it convened and who it left out so the founder can correct the roster.
- **Nine seats** (`roles/`): each file is a mandate: daily duties, decision frameworks, inputs to monitor, a fixed output format, hard nos, and a bias. Seats are deliberately opinionated so their positions conflict; the orchestrator's job is resolving that, not averaging it.
- **Cadence**: daily briefing (top 3 roadmap actions, one hard decision, risks, one non-obvious insight, pacing) and a Monday weekly (last week, this week's top bet, decisions needed). Templates live in the orchestrator file.
- **Roadmap** (`roadmap/`): phased checklist, the orchestrator's source of truth. Self-updating: work merging flips items to `[x]`, the daily run re-ranks what is unblocked, founder edits reprioritize. `regen_roadmap.py` mirrors it to an HTML dashboard and validates structure before and after writing.

## Layer 2 — execution (claudius/)

A cost-smart model-tier dispatcher for Claude Code (with a Codex companion). Doctrine:

1. **Classify** every coding task: Trivial / Standard / Complex / Architectural. Security, auth, money, migrations, and RLS auto-escalate.
2. **Route** the writing to the cheapest capable model via pinned-model subagents: trivial inline, standard to a fast writer, complex to a planner + senior writer.
3. **Gate**: a read-only skeptic model adversarially reviews the diff against its spec and the surrounding ground truth. PASS or BLOCK. Non-trivial work does not count as done without a PASS. High-stakes tasks escalate to the strongest gate model automatically; the standing setting is a floor, never a ceiling.
4. **Venue**: in-session subagents for immediate work; independent tasks spin into their own chat plus git worktree, merge back on green gates.

See `claudius/README.md` for install, the doctor health-check, and the token-discipline layers.

## The contract between layers

A seat recommendation becomes a roadmap item. A roadmap item that involves building becomes a spec with explicit done-criteria (the planner writes one for complex work). The dispatcher owns everything below the spec; the verify gate judges the diff against the spec's criteria, not against volume or style. When the gate passes and the work merges, the roadmap item flips to `[x]` and the next morning's briefing re-ranks around it. That loop, run daily, is the whole system.
