# Codex run brief

Goal: complete the real local-model smoke test for the article experiment.

1. Work only inside `experiments/one-question-seven-systems`.
2. Check whether `ollama` is installed and reachable.
3. If Ollama is installed, run `./run_local_experiment.ps1` from PowerShell.
4. If Ollama is missing, do not install anything automatically without user approval; report that blocker clearly.
5. Inspect `results/local_model_smoke.json` after the run.
6. Report per-agent task success, tool accuracy, trace completeness, average latency, and all per-scenario failures.
7. Do not treat the earlier deterministic smoke-test numbers as evidence.
8. If the real-model run exposes harness bugs, fix only genuine implementation defects, rerun the same six scenarios, and document the change.
9. Do not expand to 60 cases until the six-case real-model smoke test is stable.
10. Keep the experiment local/free unless a paid fallback is explicitly approved.
