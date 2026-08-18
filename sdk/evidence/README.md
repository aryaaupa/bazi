# Evidence outputs

This directory holds machine-generated evidence. `device-profile.reference.json` is an actual run on the development container, not a supported-device result. No real held-out participant dataset, provider approval, independent clinical/regulatory review, penetration test, or target-device energy measurement was available; the repository does not fabricate them.

Generate locked held-out model metrics with `npm run validate:model`. Generate a named device profile with `node benchmarks/device-profile.mjs`. Keep source datasets outside version control unless the approved data-governance plan explicitly permits them.
