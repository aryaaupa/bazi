#!/usr/bin/env python3
"""Build the Bazi SDK engineering evidence PDF from repository artifacts."""

from __future__ import annotations

import json
import sys
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    BaseDocTemplate, Frame, KeepTogether, PageBreak, PageTemplate, Paragraph,
    Spacer, Table, TableStyle,
)
from svglib.svglib import svg2rlg

SDK_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = SDK_ROOT.parent
OUTPUT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else REPO_ROOT / "output/pdf/Bazi_SDK_Engineering_Evidence_Report.pdf"
BENCHMARK = SDK_ROOT / "evidence/device-profile.reference.json"
FIGURES = sorted((SDK_ROOT / "docs/figures").glob("*.svg"))

NAVY = colors.HexColor("#0f172a")
TEAL = colors.HexColor("#0e7490")
PALE = colors.HexColor("#e0f2fe")
GREEN = colors.HexColor("#dcfce7")
ORANGE = colors.HexColor("#ffedd5")
RED = colors.HexColor("#fee2e2")
GRAY = colors.HexColor("#64748b")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="CoverTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=28, leading=33, textColor=NAVY, alignment=TA_CENTER, spaceAfter=18))
styles.add(ParagraphStyle(name="CoverSub", parent=styles["Normal"], fontName="Helvetica", fontSize=13, leading=18, textColor=GRAY, alignment=TA_CENTER, spaceAfter=10))
styles.add(ParagraphStyle(name="H1x", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=20, leading=24, textColor=NAVY, spaceBefore=6, spaceAfter=12))
styles.add(ParagraphStyle(name="H2x", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=14, leading=18, textColor=TEAL, spaceBefore=10, spaceAfter=7))
styles.add(ParagraphStyle(name="Bodyx", parent=styles["BodyText"], fontName="Helvetica", fontSize=9.3, leading=13.2, textColor=NAVY, spaceAfter=7))
styles.add(ParagraphStyle(name="Smallx", parent=styles["BodyText"], fontName="Helvetica", fontSize=7.8, leading=10.5, textColor=NAVY))
styles.add(ParagraphStyle(name="HeaderCell", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=7.8, leading=10.5, textColor=colors.white))
styles.add(ParagraphStyle(name="Callout", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=10, leading=14, textColor=NAVY, backColor=ORANGE, borderColor=colors.HexColor("#c2410c"), borderWidth=1, borderPadding=10, spaceBefore=8, spaceAfter=12))
styles.add(ParagraphStyle(name="FigureCaption", parent=styles["BodyText"], fontName="Helvetica", fontSize=8.5, leading=11, textColor=GRAY, alignment=TA_CENTER, spaceBefore=7))


def p(text: str, style: str = "Bodyx") -> Paragraph:
    return Paragraph(text, styles[style])


def bullet(text: str) -> Paragraph:
    return Paragraph(text, ParagraphStyle(name=f"bullet-{abs(hash(text))}", parent=styles["Bodyx"], leftIndent=14, firstLineIndent=-8, bulletIndent=4, spaceAfter=4), bulletText="-")


def table(rows, widths, header=True):
    converted = [[cell if hasattr(cell, "wrap") else p(str(cell), "HeaderCell" if header and row_index == 0 else "Smallx") for cell in row] for row_index, row in enumerate(rows)]
    result = Table(converted, colWidths=widths, repeatRows=1 if header else 0, hAlign="LEFT")
    commands = [
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    if header:
        commands += [("BACKGROUND", (0, 0), (-1, 0), NAVY), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white)]
    for row in range(1 if header else 0, len(rows)):
        if row % 2 == 0:
            commands.append(("BACKGROUND", (0, row), (-1, row), colors.HexColor("#f8fafc")))
    result.setStyle(TableStyle(commands))
    return result


def page_chrome(canvas, doc):
    canvas.saveState()
    width, height = letter
    canvas.setStrokeColor(colors.HexColor("#cbd5e1"))
    canvas.line(0.65 * inch, 0.55 * inch, width - 0.65 * inch, 0.55 * inch)
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(GRAY)
    canvas.drawString(0.65 * inch, 0.34 * inch, "Bazi SDK Engineering Evidence Report | 2026-08-18")
    canvas.drawRightString(width - 0.65 * inch, 0.34 * inch, f"Page {doc.page}")
    canvas.restoreState()


def add_section(story, title, body=None):
    story.append(p(title, "H1x"))
    if body:
        story.append(p(body))


def figure_flowable(path: Path):
    drawing = svg2rlg(str(path))
    max_width = 7.15 * inch
    max_height = 4.15 * inch
    scale = min(max_width / drawing.width, max_height / drawing.height)
    drawing.scale(scale, scale)
    drawing.width *= scale
    drawing.height *= scale
    return drawing


def build():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    benchmark = json.loads(BENCHMARK.read_text(encoding="utf-8"))
    doc = BaseDocTemplate(str(OUTPUT), pagesize=letter, leftMargin=0.68 * inch, rightMargin=0.68 * inch, topMargin=0.68 * inch, bottomMargin=0.72 * inch, title="Bazi SDK Engineering Evidence Report", author="Bazi engineering work product")
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="main")
    doc.addPageTemplates([PageTemplate(id="standard", frames=[frame], onPage=page_chrome)])
    story = []

    story += [Spacer(1, 1.05 * inch), p("BAZI ENGAGEMENT SDK", "CoverSub"), p("Engineering Evidence Report", "CoverTitle"), p("Version 0.2.0 | Status date 2026-08-18", "CoverSub"), Spacer(1, 0.25 * inch)]
    story.append(p("This report records implemented software controls, executed engineering tests, actual reference-container measurements, scientific figures, and the release gates that still require real participants, named providers, target hardware, or independent reviewers.", "Callout"))
    story += [Spacer(1, 0.25 * inch), p("Evidence boundary", "H2x"), p("The SDK is a research and integration component. It is not a clinically validated model, medical-device clearance, diagnostic or treatment recommendation, HIPAA certification, accessibility conformance claim, or substitute for independent clinical, regulatory, security, and statistical review."), PageBreak()]

    add_section(story, "1. Executive conclusion")
    story.append(p("The repository now contains enforceable implementations for the requested engineering controls: an explicit disengagement endpoint, held-out evaluation tooling, participant-level confidence intervals, subgroup and drift analysis, immutable provider-manifest enforcement, host authentication/authorization, encrypted storage, versioned consent, retention and deletion, incident logging, and signed model/config packages. Ten editable scientific and hardware SVG figures and reproducible test protocols are included."))
    story.append(p("The software can execute the required analyses, but no real held-out participant dataset, named provider approval, target-device energy result, penetration test, or independent clinical/regulatory opinion was provided. Those items are correctly marked open rather than replaced with synthetic claims.", "Callout"))
    status_rows = [
        ["Area", "Repository result", "Evidence status"],
        ["Outcome", "120-second versioned composite event with censoring", "Implemented and tested"],
        ["Validation", "Calibration, specificity, false interventions/hour, AUROC, AUPRC, cluster-bootstrap CI", "Tooling tested; participant run pending"],
        ["Action safety", "Deep-frozen reviewed manifest, contraindications, no_action", "Enforcement tested; provider approval pending"],
        ["Security/privacy", "Auth adapter, AES-GCM, consent, TTL, deletion, incidents, Ed25519", "Software tested; deployment controls pending"],
        ["Threat/accessibility", "Internal threat model and static WCAG smoke suite", "Internal/static complete; independent/manual pending"],
        ["Device evidence", "Latency, memory, CPU and external-energy harness", "Container run complete; named endpoints pending"],
        ["Clinical/regulatory", "Internal issue-spotting packet and signature form", "Independent review pending"],
    ]
    story.append(table(status_rows, [1.15 * inch, 3.35 * inch, 2.05 * inch]))
    story.append(PageBreak())

    add_section(story, "2. Locked disengagement endpoint")
    story.append(p("At decision time t0, the model predicts whether a qualifying disengagement occurs during (t0, t0 + 120 seconds]. The endpoint version is disengagement-v1.0.0. A positive event can be premature task exit, omission followed by 30 seconds of inactivity, 30 seconds of inactivity while an active task expects interaction, or failure to resume within 30 seconds after a scheduled break or acknowledged prompt."))
    for text in [
        "Label 1: a qualifying composite event is observed inside the horizon after protocol exclusions.",
        "Label 0: the complete horizon is observed with no qualifying event.",
        "Censored: follow-up ends before the horizon without a positive event.",
        "An observed positive remains positive even if later follow-up is lost.",
        "Raw interaction gaps are not endpoints until the event-generation pipeline applies context and exclusions.",
    ]:
        story.append(bullet(text))
    story.append(p("Primary source: sdk/docs/VALIDATION_PROTOCOL.md. Executable source: sdk/src/outcomes.js."))

    add_section(story, "3. Held-out validation and statistical tests")
    story.append(p("The command scripts/validate-model.mjs requires every row to identify a participant and use split=held_out. The analysis excludes censored rows from binary point estimates while retaining their count in study accounting. Whole participants, not rows, are resampled for confidence intervals."))
    metric_rows = [
        ["Metric", "Definition / repository output"],
        ["Calibration", "Reliability bins, expected calibration error, and Brier score"],
        ["Specificity", "TN / (TN + FP) at the locked threshold"],
        ["False interventions/hour", "False-positive decisions / non-overlapping monitored hours"],
        ["AUROC", "Tie-aware rank statistic across positive and negative labels"],
        ["AUPRC", "Average precision across descending predicted risk"],
        ["Confidence intervals", "Percentile interval from participant-cluster bootstrap"],
        ["Subgroups", "Same locked metrics by prespecified field; small-cell policy required"],
        ["Drift", "Population stability index plus standardized mean shift"],
    ]
    story.append(table(metric_rows, [1.75 * inch, 4.8 * inch]))
    story.append(p("Required execution: npm run validate:model -- --input held-out.jsonl --output evidence/model-validation.json --threshold [locked value] --subgroup [field] --iterations 5000", "Smallx"))
    story.append(PageBreak())

    add_section(story, "4. Provider action library and contraindications")
    story.append(p("FrozenActionManifest refuses a manifest unless status is approved and provider review metadata is complete. It validates action definitions and contraindication references, prevents rules from denying no_action, deep-freezes the approved content, and prevents runtime action registration. The draft file config/action-manifest.pending.json is intentionally marked pending_provider_review and cannot be loaded as approved."))
    for text in [
        "Review exact wording, population, setting, timing, burden, repeat limit, plausible harms, and escalation.",
        "Mark exploration unsafe by default and require explicit provider approval for protected actions.",
        "Express each stop condition as a machine-readable deny rule with clinical rationale.",
        "Re-review and re-sign every change to action wording, thresholds, contraindications, model, or configuration.",
    ]:
        story.append(bullet(text))

    add_section(story, "5. Security, privacy, and governance controls")
    security_rows = [
        ["Control", "Implementation", "Deployment responsibility"],
        ["Identity", "HostAuthorizer verifies a host principal and permission", "OIDC/FIDO/session lifecycle and least privilege"],
        ["Encryption", "AES-256-GCM, random IV, storage-key AAD, key ID", "Keystore/HSM, rotation, backup and recovery"],
        ["Consent", "Version, purposes, grant, expiry, revoke, persist, delete", "Approved text, UX, re-consent and reconciliation"],
        ["Retention", "Decision TTL and persisted-state expiry", "Approved schedule, backup and legal-hold handling"],
        ["Deletion", "Subject decisions, current state, and consent removed", "External sinks, exports, upstream stores, backups"],
        ["Incidents", "Structured severity/category/component log and sink", "Monitoring, escalation, response and reporting"],
        ["Integrity", "Canonical Ed25519 sign/verify and trusted-version hook", "Offline keys, public-key pinning, revocation, anti-rollback"],
    ]
    story.append(table(security_rows, [1.0 * inch, 2.8 * inch, 2.75 * inch]))
    story.append(PageBreak())

    add_section(story, "6. Threat-model findings")
    story.append(p("An internal data-flow and STRIDE-style review was completed on 2026-08-18. Highest-severity scenarios are modified runtime packages, contraindicated actions, and compromised endpoints/action executors. Repository mitigations reduce risk but do not replace host hardening or independent penetration testing."))
    threat_rows = [
        ["Threat", "Initial", "Primary control", "Open work"],
        ["Forged identity", "High", "Host verification + permissions", "Identity integration tests"],
        ["State disclosure/swap", "High", "AES-GCM + AAD", "Key lifecycle + backup tests"],
        ["Model/config tamper", "Critical", "Ed25519 + verified factory", "Offline custody + anti-rollback"],
        ["Unsafe action", "Critical", "Manifest + contraindications + no_action", "Provider hazard review"],
        ["Raw leakage", "High", "Immediate consume; no sample-window export", "Inspect host logs/crash/network tools"],
        ["Endpoint/executor compromise", "Critical", "Allowlisted action ID", "Code signing, sandbox, device hardening"],
    ]
    story.append(table(threat_rows, [1.35 * inch, 0.65 * inch, 2.2 * inch, 2.35 * inch]))

    add_section(story, "7. Accessibility testing")
    story.append(p("The executed static smoke suite passed 10 of 10 checks for the browser example: language, viewport, main landmark, heading, button type and accessible name, visible focus, 44-pixel targets, live status, and reduced-motion handling. This is not a WCAG conformance claim. Manual WCAG 2.2 AA and assistive-technology testing of the complete host product remains open."))

    add_section(story, "8. Actual reference-container measurements")
    ingest = benchmark["latencyMs"]["ingest"]
    decide = benchmark["latencyMs"]["decide"]
    bench_rows = [
        ["Measure", "Actual recorded value"],
        ["Host", f'{benchmark["device"]["cpuModel"]}; {benchmark["device"]["platform"]} {benchmark["device"]["architecture"]}; Node {benchmark["device"]["runtime"]}'],
        ["Workload", f'{benchmark["workload"]["measuredSamples"]} ingests and {benchmark["workload"]["measuredDecisions"]} decisions after {benchmark["workload"]["warmupSamples"]} warm-up samples'],
        ["Ingest latency", f'mean {ingest["mean"]:.5f} ms; p95 {ingest["p95"]:.5f} ms; p99 {ingest["p99"]:.5f} ms; max {ingest["max"]:.5f} ms'],
        ["Decision latency", f'mean {decide["mean"]:.5f} ms; p95 {decide["p95"]:.5f} ms; p99 {decide["p99"]:.5f} ms; max {decide["max"]:.5f} ms'],
        ["Observed peak heap", f'{benchmark["memory"]["observedPeakHeapBytes"]:,} bytes'],
        ["CPU", f'{benchmark["cpuMicroseconds"]["perMeasuredOperation"]:.3f} microseconds per measured operation'],
        ["Energy", "Not measured; external device power input is required"],
        ["Raw records after run", str(benchmark["privacy"]["rawRecordCount"])],
    ]
    story.append(table(bench_rows, [1.55 * inch, 5.0 * inch]))
    story.append(p("These are actual engineering measurements on an unidentified CI/container host. They are not target-device, battery, clinical, or scalability evidence."))
    story.append(PageBreak())

    add_section(story, "9. Test results")
    story.append(p("Executed on 2026-08-18 with Node v24.19.0: 27 unit tests passed, 0 failed. The accessibility smoke suite passed 10 of 10 checks. JavaScript syntax checks passed for source, scripts, and benchmarks; repository JSON parsed successfully. The benchmark retained zero raw-buffer records after execution."))
    for text in [
        "Outcome positives, negatives, and early censoring.",
        "Known-value AUROC, AUPRC, specificity, burden rate, calibration, bootstrap CI, subgroup and drift behavior.",
        "Frozen manifest immutability, contraindication masking, and no runtime extension.",
        "AES-GCM ciphertext round-trip without plaintext marker in the inner adapter.",
        "Ed25519 verification, tamper rejection, trusted runtime loading, and encrypted-storage production gate.",
        "Authentication, active consent, retention, deletion, incident records, approval, and reward censoring.",
    ]:
        story.append(bullet(text))

    add_section(story, "10. Clinical and regulatory screening")
    story.append(p("This report does not make a regulatory determination. Patient-facing software that analyzes interaction or sensor-derived signals and changes a therapeutic experience should not be assumed to be non-device clinical decision support. Classification depends on the final intended use, claims, users, inputs, action effects, population, and jurisdiction. HIPAA applicability depends on the entities and data flows; software components alone do not establish compliance."))
    story.append(p("Independent clinical and regulatory reviewers must document qualifications and conflicts, reviewed versions, intended-use and classification conclusions, evidence sufficiency, subgroup and action risks, required controls, and signed release conditions. The signature form is in sdk/docs/CLINICAL_REGULATORY_REVIEW_PACKET.md.", "Callout"))

    add_section(story, "11. Open release gates")
    for text in [
        "Collect a participant-disjoint silent-mode held-out dataset under the approved endpoint and protocol; run and independently review all locked metrics and confidence intervals.",
        "Obtain named provider approval for the exact action library and contraindications; sign the approved runtime package.",
        "Integrate the real identity provider, keystore/HSM, monitored audit/incident sinks, backup/deletion workflow, and version rollback policy.",
        "Run independent security review and penetration testing, manual accessibility/assistive-technology testing, and all named device/OS latency, memory, CPU, thermal, and external energy tests.",
        "Complete qualified independent clinical and regulatory assessments and approve numerical release thresholds, monitoring, stopping, and escalation rules.",
    ]:
        story.append(bullet(text))
    story.append(PageBreak())

    add_section(story, "12. Repository deliverables")
    deliverable_rows = [
        ["Path", "Purpose"],
        ["sdk/src", "SDK engine, outcome, validation, manifest, security, consent, persistence and policy modules"],
        ["sdk/test/sdk.test.js", "27-test engineering verification suite"],
        ["sdk/scripts", "Validation, signing, verification, accessibility, syntax and report tools"],
        ["sdk/benchmarks", "Reference and named-device performance harnesses"],
        ["sdk/config", "Deliberately pending provider/runtime templates"],
        ["sdk/schemas", "Telemetry, action, manifest and held-out row schemas"],
        ["sdk/docs", "Protocols, threat model, review packets and figure index"],
        ["sdk/evidence", "Machine-generated results with limitations"],
        ["output/pdf", "This consolidated evidence report"],
    ]
    story.append(table(deliverable_rows, [2.1 * inch, 4.45 * inch]))

    add_section(story, "13. Primary public references")
    refs = [
        "FDA, Clinical Decision Support Software guidance (January 2026): https://www.fda.gov/regulatory-information/search-fda-guidance-documents/clinical-decision-support-software",
        "FDA, Policy for Device Software Functions and Mobile Medical Applications: https://www.fda.gov/regulatory-information/search-fda-guidance-documents/policy-device-software-functions-and-mobile-medical-applications",
        "FDA, Cybersecurity in Medical Devices guidance: https://www.fda.gov/regulatory-information/search-fda-guidance-documents/cybersecurity-medical-devices-quality-management-system-considerations-and-content-premarket",
        "HHS, Summary of the HIPAA Security Rule: https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html",
        "W3C, Web Content Accessibility Guidelines 2.2: https://www.w3.org/TR/WCAG22/",
    ]
    for ref in refs:
        story.append(bullet(ref))
    story.append(PageBreak())

    add_section(story, "Appendix A. Scientific and hardware figures")
    story.append(p("The following editable SVGs are maintained in sdk/docs/figures. Figure 8 is intentionally a blank calibration template; it must not be populated without locked held-out data."))
    story.append(PageBreak())
    for index, path in enumerate(FIGURES):
        drawing = figure_flowable(path)
        caption = p(path.stem.replace("-", " ").title(), "FigureCaption")
        story.append(KeepTogether([drawing, caption]))
        if index != len(FIGURES) - 1:
            story.append(PageBreak())

    doc.build(story)
    print(OUTPUT)


if __name__ == "__main__":
    build()
