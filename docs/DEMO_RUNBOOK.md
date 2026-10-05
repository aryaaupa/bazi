# Bazi Dell Med conversation runbook

The website and workspace are one connected product. Start at `/app/`; open **Maya Chen**. Every participant, event, review, and outcome is synthetic. The console records local provider decisions and performs no external patient outreach.

## Six-minute walkthrough

1. **Overview (30 seconds).** Start with “Who needs attention?” The count comes from the live review gate. The first five records include the pinned index case; the rest are ordered by observed score. Secondary examples include stable participation, fatigue without disengagement, insufficient evidence, provider dismissal, and snoozed review.
2. **Maya’s record (90 seconds).** Show the 12-week trajectory, first review flag, and measured five-day retrospective warning window. Clearly distinguish unobserved generated events from the history available to scoring. Use **Hide unobserved simulation** to show only what the engine currently knows.
3. **Explain and review (90 seconds).** Open “Why now?” and inspect the actual event chronology. Compare duration, missed activity, late sessions, and engagement against observed baseline. Expand optional risk decomposition to return one model input to baseline. Approve, modify, dismiss with a structured reason, or snooze for 48 hours. Provider authority remains explicit.
4. **Observe outcome (45 seconds).** After approval, use **Advance follow-up** for the deterministic reference path. If you need to demonstrate an alternate sandbox outcome, open **Synthetic scenario selection** and choose the no-improvement reference path. The seven-day window remains anchored to approval even if the timeline advances. Compare the actual usable observations; do not call a before/after difference an intervention effect.
5. **Validation (60 seconds).** Move the alert-threshold slider. Sensitivity, specificity, total review burden, false flags, and warning time update from the reference cohort. Explain the single-landmark normalization: these are not prospective repeated-alert rates. Show PR, calibration, lead-time distribution, and the burden/sensitivity curve.
6. **Pilot configuration (45 seconds).** Open the proposed Dell Med retrospective study. Review the required de-identified events, endpoint, and censoring information. Generate the draft protocol. Phase 1 does not influence care; partnership, approval, and access are not implied.

## Rehearsing the time sequence

**Replay from baseline** on Maya’s page resets only her observed history to 17 events. **Advance patient timeline** ingests one generated event; **Advance timeline by 7 days** ingests all generated events in the next seven-day window. Each event recomputes features, the model, and the action gate. No scores are scripted.

The legacy `?guided=1` URL still starts the baseline replay for compatibility. The public website’s primary patient link opens the current index record.

## Before the meeting

- Perform the full walkthrough on the actual presentation device and projector.
- Reset the workspace in Governance to restore the seeded cohort and its recorded synthetic reference cases.
- Check the visible warning interval, a provider action, both follow-up examples, the threshold explorer, and the downloaded study protocol.
- Visit the routes online before relying on cached offline fallback.
- Use the working public URL while custom-domain verification is pending.

## Reproducibility and evidence

Seed: `90317`. Cohort: 500 participants, 36 generated events each, nine archetypes, 12 weeks. Model: `pilot-ref-0.1.0`, with frozen coefficients from `pilot/model-artifact.js`.

Validation uses an immutable generated snapshot, independently of provider decisions and added browser events. At day 53 (program day 54), one landmark per eligible participant yields 486 eligible records and 23 future seven-day endpoints: 4.73% prevalence. Already-disengaged and insufficient-data records are excluded. Labels never depend on scores.

The reference model uses six recent events. The proposed pilot’s 14-day observation window is a separate study design requiring partner-specific feature preparation; changing that draft does not change the reference artifact.

No clinical calibration, causal benefit, fairness, or prospective alert-burden conclusion follows from the generated dataset.
