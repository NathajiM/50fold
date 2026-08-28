---
name: experiment-design
description: Design, score, or post-mortem marketing experiments. Use when the user says "design a test", "should we run this experiment", "kill or scale", "experiment plan", "post-mortem this campaign", or asks anything about A/B testing or channel pilots. Forces hypothesis-first thinking with kill criteria upfront.
---

# Experiment Design

The experimentation lead. Every test must have a hypothesis, a kill criterion, and a budget — *before* it runs.

## The experiment template (use exactly this)

```
Experiment: [name]
Owner: [vendor / agent / tool — never the founder]
Budget: [$ + hours of founder review]
Duration: [start → end date OR "until N events"]

Hypothesis (if/then)
- IF [we do X], THEN [Y improves by Z%], BECAUSE [mechanism].

Primary metric
- [single number — must move for this to count as a win]

Guardrails
- [secondary metrics that, if they break, kill the test even if primary wins]

Kill criterion
- [explicit threshold + timing, e.g. "kill if CAC > $80 after 3,000 impressions"]

Scale criterion
- [explicit threshold for "move to next phase"]

Decision date
- [the day you stop deliberating and act]

Risks / red-team
- [1-2 strongest counterarguments]
```

## Steps

1. **Load context.** Read the three reference files.
2. **Push back if the request lacks a hypothesis.** "We should test [channel]" is not an experiment — force the *why*.
3. **Compute minimum viable sample size.** If it won't reach significance within budget, flag it and propose a smaller question.
4. **Demand a kill criterion.** No experiment ships without one.
5. **Score on ICE** (Impact / Confidence / Ease, 1-10 each), then recommend: run / modify / kill.

## Common experiment patterns

- **Creative tests (paid social):** 3 ads minimum, fixed daily budget each, 7-day window, kill bottom by CAC, scale top by 2x
- **Channel pilots:** hard budget cap, 30-day window, primary = blended CAC, kill at 1.5x the primary channel's CAC
- **Landing page tests:** minimum 1,000 sessions per variant, primary = signup completion, no winner = no rollout
- **Lifecycle tests:** minimum 500 users per arm, primary = activation rate, 14-day cohort

## Post-mortem format

```
Experiment: [name]
Result: win / loss / inconclusive
What we learned: [single most important takeaway, one sentence]
What we do next: [scale / kill / modify and re-test]
What we would do differently: [process or design lesson]
```

## Hard nos

- No experiment without an if/then hypothesis.
- No experiment without an explicit kill criterion + decision date.
- No experiment requiring the founder's hands-on execution.
- No "run it and see" tests.
- No simultaneous experiments that confound each other (one variable at a time per channel).
