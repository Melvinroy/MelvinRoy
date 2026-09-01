# One Question, Seven Systems — Experiment

This folder contains the reproducible experiment behind the article **One Question, Seven Systems**.

## Goal
Compare a minimal demo-style agent with a production-minded agent under the same failure scenarios.

## Cost policy
1. Local/in-house first.
2. Free cloud second.
3. Low-cost paid fallback only when needed.
4. Redesign the experiment if cost becomes material.

## Phase 1 — deterministic harness
Six deterministic scenarios—one from each failure family—validate the harness before adding model variability.

Run:
```bash
python smoke_test.py
```

## Phase 2 — same local model, two architectures
Both agents now use the **same local Ollama model** for the decision step. The production-minded version adds ambiguity, evidence, policy, retry, idempotency and tracing boundaries around the model.

Default model: `qwen2.5:3b` (override with `OLLAMA_MODEL`).

Setup:
```bash
ollama pull qwen2.5:3b
ollama serve
python local_model_test.py
```

Optional override:
```bash
OLLAMA_MODEL=llama3.2:3b python local_model_test.py
```

Results are written to:
`results/local_model_smoke.json`

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

## Interpretation rule
The deterministic smoke-test results are **not article evidence**. Publishable evidence begins only after the same real model is used for both architectures and results are reproducible across repeated runs.

## Next
Run the six-case local-model smoke test, inspect failures and traces, then expand the validated scenario definitions to ~60 cases.
