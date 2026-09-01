# One Question, Seven Systems — Experiment

This folder contains the reproducible experiment behind the article **One Question, Seven Systems**.

## Goal
Compare a minimal demo-style agent with a production-minded agent under the same failure scenarios.

## Cost policy
1. Local/in-house first.
2. Free cloud second.
3. Low-cost paid fallback only when needed.
4. Redesign the experiment if cost becomes material.

## Smoke-test phase
The first phase uses six deterministic scenarios—one from each failure family—to validate the harness before adding any model/API cost.

Failure families:
- normal
- ambiguous intent
- tool failure
- bad/stale evidence
- security/prompt injection
- recovery/idempotency

Metrics captured:
- task success
- tool-call accuracy
- recovery success
- unsafe action blocked
- trace completeness
- latency
- estimated cost

## Run

```bash
python smoke_test.py
```

No API key or paid service is required for the smoke-test phase.

## Next
After the harness passes, replace the deterministic decision layer with the same local model for both agent variants, then expand from 6 to ~60 scenarios.
