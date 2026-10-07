# Optional AI evidence synthesis

Bazi's deterministic engagement signal, evidence gates, review threshold, action policy, and provider decision workflow do not depend on an LLM.

The public workspace can optionally POST a small `bazi-evidence-summary-v1` synthetic evidence object to `/api/evidence-summary`. The Cloudflare Worker in this directory uses a Workers AI binding to produce a short provider-facing summary of evidence that is already visible in the record.

## Safety boundary

- Synthetic data only.
- No unobserved future events are sent.
- The model does not calculate or alter the Bazi engagement signal.
- The model cannot change thresholds, permitted actions, provider decisions, or audit state.
- The prompt prohibits diagnosis, acute-risk assessment, treatment/medication recommendations, causal claims, and interpreting the reference signal as a clinical probability.
- The UI labels output AI-generated and asks the reviewer to verify it against the deterministic record.
- If the endpoint is absent, rate-limited, or fails, Bazi shows its existing deterministic narrative and the rest of the workspace continues to work.

## Cloudflare setup

Deploy `worker/` as a Cloudflare Worker with the `AI` binding defined in `wrangler.toml`. Route the same-origin path `/api/evidence-summary` to that Worker for the production Bazi hostname. Do not put provider API keys in browser JavaScript or commit secrets to this repository.

The default model is `@cf/meta/llama-3.3-70b-instruct-fp8-fast`. Model availability and free-tier limits can change; swapping the Worker model must not change the evidence contract or give the model decision authority.

GitHub Pages alone cannot execute the Worker. On a Pages-only deployment the control safely falls back to the deterministic summary.
