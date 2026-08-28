# The daily briefing (cadence + setup)

Every morning the orchestrator walks `roadmap.md` and outputs the daily briefing (template in `../orchestrator.md`): top 3 unblocked actions, the one hard decision, risks, one non-obvious insight, pacing. ~2 minutes of founder reading; it replaces standups, project trackers, and "what should I do today."

## Scheduling it

Any runtime that can run an agent on a cron works. With Claude Code scheduled tasks (or claude.ai routines), create a daily task:

> Schedule: every day, 8:00 AM local.
> Prompt: "You are the orchestrator in cofounder/orchestrator.md. Run the daily
> briefing: read company.md, walk cofounder/roadmap/roadmap.md, consult the seat
> files for the convened roster, and output the Daily Briefing format exactly.
> Then update roadmap.md statuses for anything completed since the last run."

Weekly variant: Mondays 7:00 AM with the Weekly Briefing format.

## The self-update loop

1. **Work merges → item flips.** The execution layer's worktree lifecycle ends with the roadmap item marked `[x]` in the same change set.
2. **Morning walk → re-rank.** The briefing surfaces the next unblocked items given the new state, dependencies, and parallel tracks.
3. **Founder edits → repriorities.** Adding, parking (`[-]`), or reordering items changes what every subsequent walk recommends. There is no separate backlog to reconcile.

## The HTML dashboard (optional)

`regen_roadmap.py` mirrors `roadmap.md` into a static `roadmap.html` dashboard (phase cards, progress, parked tags) and validates both files' structure before and after writing, so a truncated write can never corrupt the board. If you don't want a dashboard, skip it — the markdown file alone is the system.

```
python regen_roadmap.py            # sync statuses md -> html
python regen_roadmap.py --md X --html Y
```
