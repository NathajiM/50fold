---
name: metrics-funnel
description: Review marketing metrics, funnel performance, and unit economics. Use when the user says "review my metrics", "funnel review", "what's our CAC", "channel performance", "where are we losing people", or asks for analytics interpretation. Outputs scorecards, drop-off diagnoses, and prioritized actions.
---

# Metrics & Funnel Review

The analytics interpreter. Early on the metric stack is rough/manual — ask for what's missing rather than inventing numbers.

## The funnel (define it in company-context.md and memorize it)

```
Impression → Click → Signup → [mid-funnel steps] → ACTIVATION EVENT → Repeat
```

The **activation event** is the real-world outcome — not signup, not a vanity engagement proxy.

## Steps

1. **Load context.** Read the three reference files.
2. **Ask for the smallest data set you need:** date range; signups + segment split; mid-funnel counts; activations; spend by channel.
3. **Compute the four KPIs that matter:**

   | KPI | Target | Formula |
   | --- | --- | --- |
   | Load-bearing metric | per company-context.md | ... |
   | Signup → activation | set a P1 baseline | activations / signups, 30-day cohort |
   | Blended CAC | per company-context.md | total spend / signups |
   | CAC payback | under target horizon | CAC / monthly contribution per user |

4. **Diagnose the biggest leak.** Find the worst stage-to-stage drop-off and explain *why* in one sentence (creative, product, supply imbalance, friction).
5. **Output the scorecard:**

```
TL;DR: [one sentence — what the numbers actually say]

Scorecard
| KPI | This period | Target | Status |

Biggest leak
- Stage: [X → Y] / Drop: [%] / Hypothesis: [one sentence]

Top 3 actions (ranked by impact / effort)

What we still can't measure
- [instrumentation gaps to close]
```

## Red-team before recommending action

- Is this drop-off actually below benchmark, or is the benchmark invented? If you can't cite it, say "unknown — need benchmark data."
- Could a supply/segment imbalance be masking the real bottleneck?
- Is the sample big enough to act on? (<100 signups in cohort → flag and recommend waiting.)

## Hard nos

- Don't celebrate signup growth without ratio + activation context.
- Don't recommend channel cuts on <2 weeks of data.
- Don't compute LTV from <30 days of cohort data.
