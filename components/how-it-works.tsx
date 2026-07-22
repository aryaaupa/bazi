"use client";

import { Container } from "@/components/container";
import { SectionHeading } from "@/components/section-heading";
import { FadeIn } from "@/components/fade-in";
import { motion, useReducedMotion } from "framer-motion";

const STEPS = [
  {
    title: "Observe",
    description:
      "Bazi processes consented behavioral, contextual, and progress signals from the therapeutic experience.",
  },
  {
    title: "Predict",
    description: "Models estimate when engagement is weakening before a patient fully disengages.",
  },
  {
    title: "Decide",
    description:
      "A constrained decision engine selects the next appropriate intervention from an approved therapeutic library.",
  },
  {
    title: "Adapt",
    description:
      "The product adjusts timing, sequencing, prompts, difficulty, or support based on the individual patient.",
  },
];

export function HowItWorks() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section id="how-it-works" className="bg-offwhite pb-24 md:pb-32">
      <Container>
        <SectionHeading eyebrow="How it works" title="An adaptive decision layer for every patient journey." />

        <div className="relative mt-16">
          <div className="absolute left-0 right-0 top-6 hidden h-px bg-steel-200 md:block" aria-hidden="true">
            <motion.div
              className="h-full w-full origin-left bg-green"
              initial={shouldReduceMotion ? undefined : { scaleX: 0 }}
              whileInView={shouldReduceMotion ? undefined : { scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
            />
          </div>

          <div className="grid gap-10 md:grid-cols-4 md:gap-6">
            {STEPS.map((step, i) => (
              <FadeIn key={step.title} delay={i * 0.1}>
                <div className="relative">
                  <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border border-navy bg-offwhite font-mono text-sm text-navy">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <h3 className="mt-5 font-display text-lg font-medium text-navy">{step.title}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-navy/65">{step.description}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
