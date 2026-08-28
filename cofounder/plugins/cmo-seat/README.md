# cmo-seat

The CMO seat of the 50fold cofounder system, shipped as a working Claude Code plugin — the proof that a seat is executable, not just a persona file. The strategic CMO persona (`../../roles/cmo.md`) sets direction; this plugin runs the play.

## What it does

Eight skills, each scoped to a CMO function. All skills load shared context (persona, company profile, playbook) automatically. Founder constraints are baked in — every recommendation respects the time caps and delegation rules in your company profile.

## Skills

| Skill | When it triggers |
| --- | --- |
| `daily-cmo-checkin` | "daily check-in", "morning briefing", "what should I focus on today" |
| `weekly-cmo-briefing` | "weekly briefing", "Monday review", "plan this week" |
| `paid-acquisition` | "review my ads", "scale paid", "CAC is too high" |
| `influencer-creator` | "find influencers", "draft a creator brief", "vet this creator" |
| `content-social` | "social calendar", "draft a short-form script", "review this post" |
| `metrics-funnel` | "review metrics", "funnel review", "what's our CAC" |
| `brand-pr` | "draft a press pitch", "PR plan", "positioning" |
| `experiment-design` | "design a test", "kill or scale", "experiment plan" |

## Setup

1. Fill in `references/company-context.md` and `references/growth-playbook.md` (both are templates with the placeholders marked).
2. Adjust `references/persona.md` — voice, decision style, what the CMO pushes back on.
3. Install as a Claude Code plugin, or just keep the directory in your project — the skills are plain markdown.
4. To make the cadence automatic, ask: "Schedule the daily CMO check-in for 8am every weekday."

## Tweaking it

The plugin is yours — edit anything. The three reference files are the ones to revisit over time: persona (rarely), company context (as the business evolves), playbook (quarterly).
