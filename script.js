
(() => {
  "use strict";

  const navToggle = document.querySelector(".mobile-nav-toggle");
  const primaryNav = document.getElementById("primary-nav");

  if (navToggle && primaryNav) {
    navToggle.addEventListener("click", () => {
      const open = primaryNav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", String(open));
    });

    primaryNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        primaryNav.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  const form = document.getElementById("early-access-form");
  const status = document.getElementById("form-status");

  if (form && status) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        status.textContent = "";
        return;
      }
      status.textContent = "Thank you. Your early access request has been recorded for this demo.";
      form.reset();
    });
  }

  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
})();

/* =====================================================
   Homepage Adaptive Cycle
   ===================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const startButton = document.getElementById("start-adaptive-cycle");
  const resetButton = document.getElementById("reset-adaptive-cycle");

  if (!startButton || !resetButton) {
    return;
  }

  const status = document.getElementById("adaptive-cycle-status");
  const content = document.getElementById("adaptive-reasoning-content");
  const riskValue = document.getElementById("adaptive-risk-value");
  const riskLabel = document.getElementById("adaptive-risk-label");
  const selectedAction = document.getElementById(
    "adaptive-selected-action"
  );
const cohortInsight = document.getElementById(
  "adaptive-cohort-insight"
);
  const progressSteps = Array.from(
    document.querySelectorAll("[data-cycle-step]")
  );

  const candidates = {
    reminder: document.querySelector('[data-candidate="reminder"]'),
    duration: document.querySelector('[data-candidate="duration"]'),
    difficulty: document.querySelector('[data-candidate="difficulty"]'),
    escalation: document.querySelector('[data-candidate="escalation"]')
  };

  let isRunning = false;
  let timers = [];

  const cycleSteps = [
    {
      status: "Observing signals",
      kicker: "01 · OBSERVE",
      title: "Engagement is changing across several signals.",
      description:
        "Bazi compares recent behavior with the patient’s established treatment baseline.",
      items: [
        "Completion has declined from 82% to 61%.",
        "Average session delay has increased from 8 to 31 hours.",
        "The patient reports high fatigue and excessive difficulty."
      ],
      risk: "42%",
      riskLabel: "Preliminary estimate"
    },
    {
      status: "Interpreting pattern",
      kicker: "02 · INTERPRET",
      title: "The pattern suggests rising treatment burden.",
      description:
        "No single event determines the outcome. The combined trajectory is more consistent with increasing friction than a temporary missed session.",
      items: [
        "Decline is sustained rather than isolated.",
        "Fatigue and difficulty are increasing together.",
        "Timing changes support a burden-related hypothesis."
      ],
      risk: "64%",
      riskLabel: "Moderate-high risk"
    },
    {
      status: "Evaluating responses",
      kicker: "03 · EVALUATE",
      title: "Four provider-approved actions are compared.",
      description:
        "Bazi ranks available responses by relevance, expected burden and compatibility with the current pattern.",
      items: [
        "Another reminder may not address treatment burden.",
        "Reducing duration directly lowers session friction.",
        "Difficulty adjustment remains a viable secondary response."
      ],
      risk: "78%",
      riskLabel: "High disengagement risk",
      candidateUpdates: {
        reminder: "Low fit",
        duration: "Best fit",
        difficulty: "Eligible",
        escalation: "Low fit"
      }
    },
    {
      status: "Checking guardrails",
      kicker: "04 · GUARDRAIL",
      title: "Unsafe or unnecessary actions are removed.",
      description:
        "The recommendation must remain inside the intervention boundaries configured by the therapeutic organization or clinical team.",
      items: [
        "Immediate escalation is not supported by the current threshold.",
        "Repeated reminders are unlikely to address the identified cause.",
        "Session-duration reduction is approved for this treatment stage."
      ],
      risk: "78%",
      riskLabel: "High disengagement risk",
      rejected: ["reminder", "escalation"]
    },
    {
      status: "Recommendation ready",
      kicker: "05 · ADAPT",
      title: "Reduce treatment friction.",
      description:
        "Bazi recommends shortening the next sessions while preserving the treatment goal and requiring human approval before deployment.",
      items: [
        "Reduce session duration from 25 to 15 minutes.",
        "Retain the current treatment objective.",
        "Review engagement after the next two sessions."
      ],
      risk: "78%",
      riskLabel: "Action recommended",
      selected: "duration"
    },
    {
      status: "Monitoring outcome",
      kicker: "06 · MONITOR",
      title: "The system measures whether engagement improves.",
      description:
        "After an approved adaptation is deployed, Bazi continues observing completion, timing, fatigue and treatment response.",
      items: [
        "Compare the next sessions with the pre-adaptation trajectory.",
        "Retain the change only if meaningful engagement improves.",
        "Escalate for human review if risk continues to rise."
      ],
      risk: "56%",
      riskLabel: "Projected after adaptation",
      selected: "duration",
      final: true
    }
  ];

  function clearTimers() {
    timers.forEach((timer) => window.clearTimeout(timer));
    timers = [];
  }

  function updateProgress(activeIndex) {
    progressSteps.forEach((step, index) => {
      step.classList.toggle("is-active", index === activeIndex);
      step.classList.toggle("is-complete", index < activeIndex);
    });
  }

  function updateCandidate(name, text, className = "") {
    const candidate = candidates[name];

    if (!candidate) {
      return;
    }

    candidate.classList.remove("is-selected", "is-rejected");

    if (className) {
      candidate.classList.add(className);
    }

    const label = candidate.querySelector(":scope > span");

    if (label) {
      label.textContent = text;
    }
  }

  function renderStep(step, index) {
    updateProgress(index);

    status.textContent = step.status;
    riskValue.textContent = step.risk;
    riskLabel.textContent = step.riskLabel;

    content.classList.add("is-changing");

    window.setTimeout(() => {
      content.innerHTML = `
        <p class="adaptive-reasoning-kicker">
          ${step.kicker}
        </p>

        <h3>
          ${step.title}
        </h3>

        <p>
          ${step.description}
        </p>

        <div class="adaptive-reasoning-list">
          ${step.items
            .map(
              (item) => `
                <div class="adaptive-reasoning-item">
                  <span aria-hidden="true">→</span>
                  <div>${item}</div>
                </div>
              `
            )
            .join("")}
        </div>
      `;

      content.classList.remove("is-changing");
    }, 180);

    if (step.candidateUpdates) {
      Object.entries(step.candidateUpdates).forEach(([name, label]) => {
        updateCandidate(name, label);
      });
    }

    if (step.rejected) {
      step.rejected.forEach((name) => {
        updateCandidate(name, "Rejected", "is-rejected");
      });
    }

    if (step.selected) {
      updateCandidate(step.selected, "Selected", "is-selected");

      selectedAction.classList.add("is-ready");
      selectedAction.innerHTML = `
        <span>SELECTED RESPONSE</span>

        <h3>
          Reduce session duration
        </h3>

        <p>
          Shorten upcoming sessions from 25 to 15 minutes. Human
          approval remains required before deployment.
        </p>
      `;
    }

    if (step.final) {
      startButton.disabled = false;
      startButton.textContent = "Run Again";
      isRunning = false;
    }
  }

  function startCycle() {
    if (isRunning) {
      return;
    }

    clearTimers();
    resetCycle(false);

    isRunning = true;
    startButton.disabled = true;
    startButton.textContent = "Cycle Running";

    cycleSteps.forEach((step, index) => {
      const timer = window.setTimeout(() => {
        renderStep(step, index);
      }, index * 2100);

      timers.push(timer);
    });
  }

  function resetCycle(clear = true) {
    if (clear) {
      clearTimers();
    }

    isRunning = false;

    status.textContent = "Ready";
    riskValue.textContent = "—";
    riskLabel.textContent = "Awaiting evaluation";

    progressSteps.forEach((step, index) => {
      step.classList.remove("is-active", "is-complete");

      if (index === 0) {
        step.classList.add("is-active");
      }
    });

    Object.keys(candidates).forEach((name) => {
      updateCandidate(name, "Pending");
    });

    selectedAction.classList.remove("is-ready");
    selectedAction.innerHTML = `
      <span>SELECTED RESPONSE</span>

      <h3>
        No action selected
      </h3>

      <p>
        Bazi will select only from actions configured by the
        therapeutic organization or clinical team.
      </p>
    `;

    content.innerHTML = `
      <p class="adaptive-reasoning-kicker">
        READY TO EVALUATE
      </p>

      <h3>
        Behavioral signals are available.
      </h3>

      <p>
        Start the cycle to see how Bazi interprets the current
        pattern and evaluates provider-approved actions.
      </p>
    `;

    startButton.disabled = false;
    startButton.textContent = "Start Adaptive Cycle";
  }

  startButton.addEventListener("click", startCycle);
  resetButton.addEventListener("click", () => resetCycle(true));
});
