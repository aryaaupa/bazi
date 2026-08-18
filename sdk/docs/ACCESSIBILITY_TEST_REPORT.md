# Accessibility test report and protocol

Test date: 2026-08-18  
Target: `examples/browser.html`  
Standard target: WCAG 2.2 AA  
Automated scope: dependency-free structural smoke checks only

`npm run check:a11y` passed checks for document language, viewport, one main landmark, heading, accessible button name/type, visible focus, 44-pixel target sizing, polite live status, and reduced-motion handling.

This pass is not a WCAG conformance claim. Before release, test the complete host product—not only this SDK example—with keyboard-only navigation; 200% and 400% zoom/reflow; forced colors/high contrast; text spacing; reduced motion; VoiceOver/Safari, NVDA/Firefox, and TalkBack/Chrome; switch and voice input where supported; orientation and touch target behavior; error identification/recovery; timeout extension; reading/cognitive load; action wording; and interruption frequency. Test every intervention state, provider-approval flow, consent version transition, deletion request, authentication error, offline state, and safety shutoff.

Record tester, device, OS, browser/assistive-technology versions, applicable WCAG success criterion, reproduction steps, severity, fix, retest result, and residual rationale. A qualified independent accessibility review remains a release gate.
