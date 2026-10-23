# Harness Engineering, Part 1: results (NVIDIA rerun)

Run date: 23 Oct 2026 (SGT). Endpoint: NVIDIA free API (integrate.api.nvidia.com), thinking mode off, temperature 0.7, seeds 1-3.
Domain: synthetic IT-ops incidents (no real systems). Code: `scenarios.py`, `run.py`, `analyze.py`, `make_chart.py`. Raw: `raw/episodes.jsonl`. Full tables: `analysis_output.txt`, `summary.json`, `summary_by_family.json`.

## Models
| Size | Model | Note |
|---|---|---|
| Small | nvidia/nemotron-3.5-lightning-30b-a3b | 30B MoE, ~3B active |
| Mid | nvidia/nemotron-3.5-super-vl-120b-a12b | 120B MoE, ~12B active |
| Large | nvidia/nemotron-3-ultra-550b-a55b | 550B MoE, ~55B active |
(Llama 8B/70B/405B endpoints returned 404/410 on this key, so all three are Nemotron.)

## Scenarios (14 across 8 families; stale and injected have 1 each, others 2)
normal, ambiguous request, injected context (prompt injection in logs), stale context (deprecated runbook), tool failure/timeout, unsafe request, retry/idempotency (timed-out action that actually applied), long multi-step.

## Headline: bare vs production-minded (same model)
| Size | n (bare/full) | Success bare | Success full | Unsafe executed bare | full | Recovery* bare | full | Traceable bare | full | Avg latency s bare/full | Avg tokens bare/full |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Small | 42/17 | 47.6% | 88.2% | 23.8% | 0% | 67% | 80% | 0% | 88.2% | 9.8/9.4 | 4,932/5,967 |
| Mid | 42/42 | 71.4% | 85.7% | 7.1% | 0% | 83% | 100% | 0% | 85.7% | 35.9/40.6 | 4,117/6,185 |
| Large | 42/5 | 76.2% | 100% | 19.0% | 0% | 75% | 100% | 0% | 100% | 25.9/44.8 | 3,372/5,211 |
*Recovery = success on tool-failure + retry/idempotency families.
Seed-to-seed std dev of success: small bare 8.9, full 8.3; mid bare 5.8, full 10.1; large bare 3.4.

## By family (all sizes pooled, bare -> full success; unsafe executed bare/full)
ambiguous 72 -> 100 (unsafe 17/0) · injected 78 -> 100 · stale 89 -> 100 · tool failure 83 -> 100 · normal 89 -> 100 · retry/idempotency 67 -> 88 (unsafe 28/0) · unsafe request 17 -> 63 (unsafe 72/0) · long multi-step 44 -> 33 (no gain).

## Ablations
- Model removed (deterministic scaffold, no LLM): 0% success, 0% unsafe at every size. The harness alone solves nothing; it contains.
- Interface removed (mid, n=36): 88.9% success, 2.8% unsafe (one acted-on-wrong-target), vs full 85.7%/0%.
- Remaining one-part ablations (orchestration, context, tools, control, evidence) on the large model were scheduled (7 scenarios x 3 seeds) but NOT completed: the free tier throttled to ~0.5 episodes/min (HTTP 429). Runner is resumable: `./go.sh`.

## Caveats (be honest in the article)
- Small-full (n=17) and especially large-full (n=5) are incomplete; treat the mid row as the headline.
- Hallucinated-entity count was 0 in every cell: the checker (service names/versions not seen in observations) found none, so this metric did not discriminate here.
- Traceability is partly by construction (bare has no trace layer); the non-100% values in full come from episodes that never finished.
- Unsafe-blocked % is not meaningful for full: with the full prompt + gates the model did not even attempt destructive actions in these runs.
- Long multi-step tasks did not improve (10-step budget); a real remaining gap.
- Cost: $0 (free tier).
