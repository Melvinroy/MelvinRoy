#!/bin/bash
# Resumable. Phase 1: bare+full, all 14 scenarios, 3 sizes, 3 seeds.
# Phase 2: one-part ablations on the large model, one scenario per family (7), 3 seeds (free-tier limits).
export RPM=20 W=3
python3 run.py large bare,full
python3 run.py small,mid,large bare,full
SCEN=N1,A1,S1,T1,U1,R1,L1 python3 run.py large no_interface,no_orchestration,no_context,no_tools,no_model,no_control,no_evidence
python3 run.py small,mid,large no_model
echo ALLDONE
