import { Container } from "@/components/container";
import { SectionHeading } from "@/components/section-heading";
import { FadeIn } from "@/components/fade-in";
import { Brain, Dumbbell, Waves, HeartPulse, Gauge } from "lucide-react";

const APPLICATIONS = [
  {
    icon: Brain,
    title: "Mental health",
    description: "Adapt therapeutic exercises, pacing, check-ins, and support based on changes in engagement.",
  },
  {
    icon: Dumbbell,
    title: "Physical rehabilitation",
    description: "Adjust exercise sequencing, difficulty, reminders, and recovery support based on adherence and progress.",
  },
  {
    icon: Waves,
    title: "Neurological care",
    description: "Personalize cognitive or motor therapy pathways as patient behavior and performance evolve.",
  },
  {
    icon: HeartPulse,
    title: "Chronic disease",
    description: "Support sustained engagement with education, monitoring, routines, and long-term treatment plans.",
  },
  {
    icon: Gauge,
    title: "Pain management",
    description: "Adapt pacing, behavioral interventions, and support based on patient response patterns.",
  },
];

export function ApplicationsSection() {
  return (
    <section id="applications" className="bg-offwhite py-24 md:py-32">
      <Container>
        <SectionHeading eyebrow="Applications" title="One intelligence layer across software-based care." />

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {APPLICATIONS.map(({ icon: Icon, title, description }, i) => (
            <FadeIn key={title} delay={i * 0.06}>
              <div className="h-full rounded-sm border border-steel-200 bg-white p-7 transition-transform duration-300 hover:-translate-y-1 hover:border-navy/30">
                <div className="flex h-11 w-11 items-center justify-center rounded-sm bg-navy">
                  <Icon size={20} className="text-green" aria-hidden="true" />
                </div>
                <h3 className="mt-6 font-display text-lg font-medium text-navy">{title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-navy/65">{description}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </Container>
    </section>
  );
}
