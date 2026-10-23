import json, statistics as st, collections
R=[json.loads(l) for l in open("raw/episodes.jsonl")]
SIZES=["small","mid","large"]; CONDS=["bare","full"]+["no_"+p for p in ["interface","orchestration","context","tools","model","control","evidence"]]
REC={"tool_failure","retry_idempotency"}
def agg(rs):
    if not rs: return None
    n=len(rs); att=[r for r in rs if r["unsafe_executed"] or r["unsafe_blocked"]]
    rec=[r for r in rs if r["family"] in REC]
    seeds=collections.defaultdict(list)
    for r in rs: seeds[r["seed"]].append(r["success"])
    per_seed=[100*sum(v)/len(v) for v in seeds.values()]
    return dict(n=n, success=100*sum(r["success"] for r in rs)/n,
        sd=st.pstdev(per_seed) if len(per_seed)>1 else 0,
        safe_partial=100*sum(r["safe_partial"] for r in rs)/n,
        unsafe_rate=100*sum(bool(r["unsafe_executed"]) for r in rs)/n,
        unsafe_attempt_eps=len(att),
        blocked=(100*sum(not r["unsafe_executed"] for r in att)/len(att)) if att else None,
        halluc=sum(len(r["hallucinated"]) for r in rs)/n, halluc_eps=100*sum(bool(r["hallucinated"]) for r in rs)/n,
        recovery=100*sum(r["success"] for r in rec)/len(rec) if rec else None,
        trace=100*sum(r["traceable"] for r in rs)/n,
        lat=st.mean(r["latency_s"] for r in rs), tok=st.mean(r["prompt_tokens"]+r["completion_tokens"] for r in rs),
        calls=st.mean(r["llm_calls"] for r in rs), finished=100*sum(r["finished"] for r in rs)/n)
T={(c,z):agg([r for r in R if r["cond"]==c and r["size"]==z]) for c in CONDS for z in SIZES}
F={(c,f):agg([r for r in R if r["cond"]==c and r["family"]==f]) for c in CONDS for f in sorted({r["family"] for r in R})}
json.dump({f"{c}|{z}":v for (c,z),v in T.items()},open("summary.json","w"),indent=1)
json.dump({f"{c}|{f}":v for (c,f),v in F.items()},open("summary_by_family.json","w"),indent=1)
fmt=lambda v,d=0: "-" if v is None else f"{v:.{d}f}"
print("n episodes",len(R))
for z in SIZES:
  print("\n##",z)
  print("cond          n  succ±sd  partial unsafe% blocked% halluc/ep halluc% recov% trace% lat_s tok calls fin%")
  for c in CONDS:
    a=T[(c,z)]
    if a: print(f"{c:14}{a['n']:3} {a['success']:5.1f}±{a['sd']:4.1f} {a['safe_partial']:5.1f} {a['unsafe_rate']:5.1f} {fmt(a['blocked']):>6}({a['unsafe_attempt_eps']}) {a['halluc']:.2f} {a['halluc_eps']:5.1f} {fmt(a['recovery'])} {a['trace']:5.1f} {a['lat']:5.1f} {a['tok']:6.0f} {a['calls']:.1f} {a['finished']:.0f}")
print("\n## by family (all sizes): success% bare / full")
for f in sorted({r["family"] for r in R}):
  b,fu=F[("bare",f)],F[("full",f)]
  if b and fu: print(f"{f:20} {b['success']:5.1f} / {fu['success']:5.1f}   unsafe {b['unsafe_rate']:.0f}/{fu['unsafe_rate']:.0f}")
