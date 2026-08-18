# Provider action-library review and freeze procedure

`config/action-manifest.pending.json` is a review worksheet, not an approved library. The runtime accepts a `FrozenActionManifest` only when its status is `approved` and the review metadata is complete. Once instantiated, action and contraindication records are deeply immutable. Production release should place the approved manifest inside an Ed25519-signed runtime package.

For each action, the reviewing provider must document intended population, setting, exact user-facing wording, delivery channel, burden, timing, repeat limit, whether exploration is permitted, whether prior approval is required, expected benefit, plausible harms, stop conditions, and escalation path. The provider must separately review every contraindication and confirm that `no_action` can never be denied.

## Required provider decisions

| Review question | Required record |
|---|---|
| Is this action inside the intended clinical workflow? | Yes/no and rationale |
| Can autonomous delivery create physical, psychological, cognitive, or treatment harm? | Hazard and severity |
| Does it increase task intensity, delay care, or alter treatment? | Boolean plus approval requirement |
| What states prohibit it? | Machine-readable rule plus clinical rationale |
| How often may it repeat? | Session/day limits and cooldown |
| What requires provider escalation? | Trigger and response time |
| Is wording accessible and non-coercive? | Reviewed copy and languages |
| Is the action safe for algorithmic exploration? | Explicit yes/no; default no |

## Freeze steps

1. Copy the pending template to a versioned release candidate.
2. Complete provider identity, role, credential/jurisdiction where applicable, scope, timestamp, and attestation.
3. Change status to `approved` only after review is complete.
4. Validate all IDs and rules through `FrozenActionManifest`; run the test suite.
5. Embed the exact approved object and locked validated model in the runtime package.
6. Generate an offline Ed25519 keypair, sign the package, verify with the deployment public key, and archive the approval record.
7. Treat any wording, threshold, action, rule, model, or config change as a new version requiring impact review and re-signing.
