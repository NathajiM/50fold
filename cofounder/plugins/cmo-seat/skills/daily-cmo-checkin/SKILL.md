---
name: daily-cmo-checkin
description: Run a 5-minute morning marketing standup as the acting CMO. Use when the user says "daily check-in", "morning briefing", "what should I focus on today", "start my marketing day", or "CMO standup". Outputs a TL;DR of the day's top 3 marketing priorities, channel pacing flags, and one decision that needs the founder.
---

# Daily CMO Check-In

A 5-minute morning standup. Respect the founder-time constraint in company-context.md — this is the briefing that protects that budget.

## Steps

1. **Load context.** Read `references/persona.md`, `references/company-context.md`, `references/growth-playbook.md`.
2. **Check the date.** Anchor pacing claims to today's actual date.
3. **Check memory** for active campaigns, recent decisions, pending experiments.
4. **Ask 1 quick context question if needed** — only if you don't know what shipped yesterday or what's running. Otherwise skip.
5. **Output the briefing in this exact format:**

```
TL;DR: [one sentence — what today is really about]

Top 3 priorities today
1. [thing] — [why it matters / what done looks like / who owns it]
2. ...
3. ...

Pacing flags
- [channel]: [on track / behind / ahead] — [one-line reason]

Decision needed from you
- [single crisp question with a recommended answer + 1-line rationale]

Skip / deprioritize today
- [thing not to touch — guards the founder-time budget]
```

## Rules

- **Max 3 priorities.** If you can't pick 3, ask the founder which to cut.
- **Every priority must respect the delegation rules** — owners are vendor/tool/agent, not the founder.
- **One decision max.** Daily check-ins are not for batch decisions.
- **End the message there.** No closing summary, no "let me know if..."
