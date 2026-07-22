import { Container } from "@/components/container";
import { SectionHeading } from "@/components/section-heading";
import { FadeIn } from "@/components/fade-in";
import { TrendingUp, Shuffle, Lock } from "lucide-react";

const PILLARS = [
  {
    icon: TrendingUp,
    title: "Predictive, not reactive",
    description: "Identify emerging disengagement before it becomes abandonment.",
  },
  {
    icon: Shuffle,
    title: "Adaptive, not scripted",
    description: "Continuously select the most appropriate next step instead of following one fixed sequence.",
  },
  {
    icon: Lock,
    title: "Private by design",
    description: "Support local inference and minimize unnecessary movement of sensitive patient data.",
  },
];

export function DifferentiationSection() {
  return (
    <section className="bg-offwhite pb-24 md:pb-32">
      <Container>
        <SectionHeading eyebrow="Differentiation" title="Personalization should happen before the patient leaves." />

        <div className="mt-16 grid gap-8 md:grid-cols-3 md:gap-10">
          {PILLARS.map(({ icon: Icon, title, description }, i) => (
            <FadeIn key={title} delay={i * 0.08}>
              <Icon size={22} className="text-green" aria-hidden="true" />
              <h3 className="mt-5 font-display text-lg font-medium text-navy">{title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-navy/65">{description}</p>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={0.2} className="mt-16 border-t border-steel-200 pt-10">
          <p className="font-display text-xl font-medium text-navy sm:text-2xl">
            Today&apos;s therapy apps follow a script. Bazi helps them make decisions.
          </p>
        </FadeIn>
      </Container>
    </section>
  );
}
