# Clinical and regulatory review packet

Status: **not independently reviewed**. This is an internal screening packet, not legal advice, a regulatory determination, clinical approval, or a claim of compliance.

## Proposed intended-use boundary for review

The SDK processes interaction-derived features to estimate a near-term risk of a defined disengagement event and selects from a provider-approved set of low-burden engagement actions, including `no_action`. It is not intended to diagnose a disease, calculate treatment dosage, replace professional judgment, or respond to emergencies. Exact population, clinical condition, care setting, user, platform, and action effects remain to be specified by the sponsor.

## Preliminary internal assessment

Regulatory status depends on final intended use, claims, users, inputs, and actions. Patient-facing software that analyzes interaction or sensor-derived signals and changes a therapeutic experience may be a device software function; it should not be assumed to qualify as non-device clinical decision support. FDA's January 2026 Clinical Decision Support guidance addresses the statutory non-device CDS criteria, and FDA's device-software policy provides further oversight context. A qualified regulatory professional must classify the actual product and determine the submission, quality-system, clinical-evidence, human-factors, and postmarket obligations.

HIPAA applicability depends on the entities, relationships, and data flows, not on this SDK. HHS describes administrative, physical, and technical safeguards for regulated electronic protected health information. The encrypted adapter, consent manager, and logs are components—not HIPAA compliance.

## Independent reviewer questions

Clinical reviewer: confirm endpoint clinical meaning; intended population and exclusions; action hazards and contraindications; escalation and emergency boundaries; burden; acceptability of false interventions and misses; subgroup risks; human factors; monitoring; and stopping rules.

Regulatory reviewer: document jurisdiction, product classification, device/non-device rationale, predicate or pathway if any, quality-system applicability, software documentation level, clinical evaluation, cybersecurity, labeling, privacy, accessibility, change control, and postmarket obligations.

## Required signed conclusion

Reviewer name/organization: ____________________  
Qualifications and conflicts: ____________________  
Documents and version reviewed: ____________________  
Jurisdiction and classification conclusion: ____________________  
Clinical evidence conclusion and limitations: ____________________  
Required actions before pilot/release: ____________________  
Signature/date: ____________________

## Current primary references

- FDA, Clinical Decision Support Software guidance (January 2026): https://www.fda.gov/regulatory-information/search-fda-guidance-documents/clinical-decision-support-software
- FDA, Policy for Device Software Functions and Mobile Medical Applications: https://www.fda.gov/regulatory-information/search-fda-guidance-documents/policy-device-software-functions-and-mobile-medical-applications
- FDA, Cybersecurity in Medical Devices guidance: https://www.fda.gov/regulatory-information/search-fda-guidance-documents/cybersecurity-medical-devices-quality-management-system-considerations-and-content-premarket
- HHS, Summary of the HIPAA Security Rule: https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html
- W3C, Web Content Accessibility Guidelines 2.2: https://www.w3.org/TR/WCAG22/
