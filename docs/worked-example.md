# Worked example: one spec-to-ship loop, for real

This is one actual loop from CourtMe's build record (v2 "Sprint 10", the analytics/finance sprint), lightly sanitized. It shows every stage the architecture doc describes, including the part that matters most: the verification gate catching a real bug that a human reviewer skimming SQL would plausibly have missed.

## 1. Roadmap item

The roadmap's monetization phase carried an item:

> `[ ]` Admin revenue analytics: per-period gross/net revenue view + unit-economics rollup for the investor snapshot

## 2. Seats convene

The orchestrator convened three seats (and named who it left out):

- **CFO**: net revenue feeds runway and unit-economics; wrong numbers here poison every capital decision downstream. Wants refunds handled explicitly.
- **CTO**: build it as SQL views over the existing purchase ledger, no new write paths; keep it read-only for the admin console.
- **CLO**: revenue figures reach an investor snapshot; overstating OR understating is a disclosure problem. Flags it as a money-touching change.

Force-ranked outcome: build now, spec below, and because it touches money it auto-escalates to the strongest verification gate.

## 3. Spec (done-criteria)

- A `consumer_revenue` view: per-period gross, refunds, net, by product tier.
- Net must reconcile with the purchase ledger under every `validation_status` transition, including refunds.
- Read-only surface; no new table grants.
- Passes the full RLS test suite (no policy regressions).

## 4. Dispatch

Classified **Complex, money-touching**: planner model wrote the migration plan; senior writer model produced the migrations and view SQL; test run green; RLS suite green.

## 5. The gate says BLOCK

The adversarial verifier (strongest tier, per the money escalation) was tasked to break the claim "net revenue is correct." It found:

> `net_revenue_cents` **double-subtracts refunds**. A refund flips the row's `validation_status` from `validated` to `refunded` in place, so a refunded sale has already left the `validated` bucket; subtracting refunds again understates net by the full refund amount and can push it **negative**. The error propagates into the unit-economics rollup and the investor snapshot.

Three independent verifier passes confirmed it. Status: **BLOCK**.

## 6. Fix and re-verify

One corrective migration (`CREATE OR REPLACE VIEW`, identical columns, so no downstream breakage):

```sql
gross = validated + refunded   -- what was actually sold
net   = validated              -- == gross - refunded, subtracted exactly once
```

Re-run: RLS suite green, verifier re-traced the arithmetic against the ledger states, returned **PASS**.

## 7. Merge and roadmap update

The work merged, the roadmap item flipped to `[x]`, and the next morning's briefing re-ranked around it, surfacing the next unblocked monetization item.

## Why this example

It is unglamorous, which is the point. The system's value is not that agents write code fast; it is that a skeptic model with no stake in the diff, prompted to refute it, caught a revenue-reporting bug before it reached an investor document, and the roadmap absorbed the whole event without any project-management overhead.

---

*Provenance: the finding, the fix, and the verification verdicts (sections 5-6) are taken directly from the build's adversarial-pass report. The seat roundtable in section 2 is reconstructed from the sprint record to show the convening step; the original conversation was not transcribed.*
