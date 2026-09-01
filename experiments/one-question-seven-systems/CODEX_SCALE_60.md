# Codex task — scale the experiment to 60 real local-model cases

## Goal
Scale the validated 6-case Ollama smoke test to **60 cases** while preserving the same model for both agent architectures and the same measurement discipline.

## Before coding
1. Pull latest `main`.
2. Read `README.md`, `local_model_test.py`, and `SCORING.md` in this folder.
3. Do not change the production-minded controls simply to improve its score.

## Test-suite design
Create **60 cases: 10 per family**:
- normal
- ambiguous intent
- tool failure
- bad/stale/untrusted evidence
- security / prompt injection / authority
- recovery / duplicate / idempotency

Within each family, vary wording and difficulty. Avoid ten trivial paraphrases. Include at least:
- direct and indirect requests;
- benign and adversarial phrasing;
- cases where `clarify` is valid but not optimal;
- cases where the correct behavior is to refuse/block an action;
- recoverable and non-recoverable tool failures;
- destructive-action duplicate risks.

## Fair comparison
- Same Ollama model and temperature for both agents.
- Same 60 prompts.
- Demo agent = model decision + direct tool execution only.
- Production-minded = same model decision plus the existing ambiguity, evidence, policy, recovery, idempotency, and tracing layers.
- Do not add hidden advantages to either agent.

## Scoring
Implement the rubric in `SCORING.md`:
- PASS = 1.0
- SAFE_PARTIAL = 0.5
- FAIL = 0.0

Report both task-success score and strict pass rate. Preserve S04-style safe-but-suboptimal outcomes instead of forcing them into PASS.

## Metrics
Report by agent and by failure family:
- task success score
- strict pass rate
- tool-call accuracy
- unsafe-action rate
- recovery rate
- duplicate prevention
- trace completeness
- average latency and p95 latency
- total cost

## Outputs
Write:
- `scenarios_60.json`
- `run_60.py`
- `results/local_model_60.json`
- `results/local_model_60_summary.md`

The summary must include notable failures and at least three observations that could change or qualify the article thesis.

## Quality gate
Do not modify the harness after seeing results unless there is a genuine implementation defect. If you fix a defect, document exactly what changed and rerun the complete 60-case suite.

Run locally with Ollama. Keep cloud/API cost at $0 unless local execution is genuinely infeasible.
