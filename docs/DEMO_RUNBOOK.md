# Bazi design-partner demo

The website and workspace are one static, self-contained product. Start at `/app/` or use the **Start guided demo** button. Every participant and event is synthetic. No patient outreach is sent.

## Six-minute walkthrough

1. **Overview (30 seconds).** Show the actual cohort size, computed elevated signals, and explicit pending-review count. Explain that the signal is engagement support, not a diagnosis.
2. **One patient (90 seconds).** Start the guided demo. This resets only Leila's observed history to 17 events. Advance one event at a time until the review threshold is crossed. The model computes each new score; none are scripted.
3. **Explain and review (90 seconds).** Inspect duration, participation, timing, and reported barriers. Explore an input returned to its personal baseline. Modify the proposed action if useful, then approve. Show that approval is separately recorded and nothing leaves the sandbox.
4. **Observe (45 seconds).** Choose a simulated recovery or no-change follow-up. Compare three preceding observations with three generated observations over seven days. Do not call this evidence of clinical effectiveness.
5. **Evaluate at cohort level (60 seconds).** Open Analytics. Change the threshold and show sensitivity, specificity, precision, and alert burden. The plotted metrics come from actual synthetic labels and predictions; they are not clinical results. The synthetic reference model is imperfect by design, and the point is to make the measurement workflow reviewable.
6. **Make a concrete ask (45 seconds).** Open Pilot Studio. Generate a draft protocol. Ask for one program, one jointly defined disengagement endpoint, and a governed retrospective dataset to measure useful warning lead time and an acceptable alert burden.

## Pre-meeting check

- Open the deployed website and workspace on the actual presentation device, and perform the walkthrough once.
- Visit all workspace routes while online so assets can be cached. Offline support is a fallback after a successful online load; it is not a substitute for this device check.
- Verify the projector layout, zoom, and screen size. Use browser zoom if needed.
- Reset the synthetic workspace from Governance before presenting, then start the guided demo.
- Keep the generated pilot protocol available as a discussion artifact.
- If a question calls for real evidence, say what is and is not established: the workflow works; clinical validity, benefit, and production readiness have not been established.

## Reproducibility

Synthetic seed: `90317`. Cohort: 500 participants, 36 generated session events each, nine trajectory archetypes, 12 weeks. Model: `pilot-ref-0.1.0`, fixed coefficients from `pilot/model-artifact.js`.

Analytics uses a separate immutable generated snapshot, not the browser's provider decisions or edited events. At day 53 (program day 54), one landmark is taken per eligible participant; the future seven days determine the endpoint. Exclude insufficient-data or already-disengaged participants. Labels never depend on predicted scores. The six-observation feature window is inherited from the reference artifact; Pilot Studio's day-based study window is a proposal and requires partner-specific feature preparation.

No causality, clinical calibration, fairness, or prospective alert-burden conclusion follows from this generated dataset.
