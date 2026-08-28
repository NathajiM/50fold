# Company profile — fill this in first

Every seat and the orchestrator read this file before answering. Copy to `company.md`, replace every value, delete the examples. Keep it under a page: the point is shared, loadable context, not documentation.

```markdown
# {{COMPANY}} — Company Profile

## Mission (one sentence, locked)
{{MISSION}}
<!-- example: "Make great dates with the right people effortless." -->

## What we are / aren't
- We are: {{CATEGORY_FRAMING}}
- We aren't: {{ANTI_POSITIONING}}
<!-- example: "an AI-native dating app that orchestrates real-world dates" /
     "another swipe app, another matchmaking service" -->

## North-star metrics
- Activation event: {{ACTIVATION_EVENT}}   <!-- the real-world outcome, not a proxy.
     example: "date completed", not "signup" -->
- Load-bearing metric: {{LOAD_BEARING_METRIC}}  <!-- the one that gates everything else.
     example: "female:male ratio >= 1:1 in launch-market cohort" -->
- Headline target: {{HEADLINE_TARGET}}     <!-- example: "$1M ARR by month 12" -->

## Bull case (anchors every strategic call)
{{BULL_CASE}}
<!-- example: "N users at $X valuation, built on a market-expansion thesis" -->

## Launch market
{{LAUNCH_MARKET}} first. Exit criteria before expanding: {{EXPANSION_EXIT_CRITERIA}}

## Founder constraints (hard limits; seats never re-litigate these)
- {{TIME_CONSTRAINTS}}     <!-- example: "solo founder, full-time; <=8 hrs/wk on
     in-person small-event marketing" -->
- {{DELEGATION_RULES}}     <!-- example: "founder runs paid with AI agents; never
     recommend hiring a media buyer" -->

## Hard nos (system-wide)
- {{HARD_NO_1}}            <!-- example: "no partnerships with companies that have
     a competing product" -->
- {{HARD_NO_2}}
```

## Why a single file

Constraints repeated across nine persona files drift. Here they live once; a seat that needs the founder-time cap or the launch-market rule reads it from the same place the orchestrator does. When the business changes, one edit updates the whole roster.
