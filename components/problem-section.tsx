import { Container } from "@/components/container";
import { SectionHeading } from "@/components/section-heading";
import { FadeIn } from "@/components/fade-in";
import { Check, X } from "lucide-react";

const CONDITIONS = [
  "Depression and anxiety",
  "ADHD",
  "Chronic pain",
  "Stroke recovery",
  "Musculoskeletal rehabilitation",
  "Chronic disease management",
];

const TRADITIONAL = [
  "Fixed treatment sequence",
  "Same logic for broad patient groups",
  "Responds after inactivity",
  "Limited personalization",
];

const BAZI_ENABLED = [
  "Continuously evaluates engagement",
  "Predicts disengagement risk",
  "Selects the next appropriate intervention",
  "Adapts to individual behavior and progress",
];

export function ProblemSection() {
  return (
    <section id="product" className="bg-offwhite py-24 md:py-32">
      <Container>
        <SectionHeading
          eyebrow="The problem"
          title="Digital treatment works only when patients stay with it."
          description="Digital therapeutics can support treatment across mental health, neurological care, chronic disease, pain management, and physical rehabilitation."
        />

        <FadeIn delay={0.1} className="mt-10">
          <div className="flex flex-wrap gap-2.5">
            {CONDITIONS.map((c) => (
              <span key={c} className="rounded-sm border border-steel-200 bg-white px-4 py-2 text-sm text-navy/80">
                {c}
              </span>
            ))}
          </div>
        </FadeIn>

        <FadeIn delay={0.15} className="mt-10 max-w-3xl space-y-3 text-navy/70">
          <p className="leading-relaxed">
            Most digital therapeutics follow predefined treatment paths, but patients respond
            differently. Disengagement often develops gradually, and most systems react only
            after engagement has already been lost.
          </p>
          <p className="leading-relaxed">
            Lower adherence reduces both clinical value and commercial performance.
          </p>
        </FadeIn>

        <div className="mt-16 grid gap-5 md:grid-cols-2">
          <FadeIn delay={0.1}>
            <div className="h-full rounded-sm border border-steel-200 bg-white p-8">
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-navy/50">
                Traditional digital therapeutic
              </p>
              <ul className="mt-6 space-y-4">
                {TRADITIONAL.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-navy/75">
                    <X size={16} className="mt-0.5 shrink-0 text-gray" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </FadeIn>

          <FadeIn delay={0.2}>
            <div className="h-full rounded-sm border border-navy bg-navy p-8">
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-green">
                Bazi-enabled therapeutic
              </p>
              <ul className="mt-6 space-y-4">
                {BAZI_ENABLED.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-offwhite/85">
                    <Check size={16} className="mt-0.5 shrink-0 text-green" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </FadeIn>
        </div>
      </Container>
    </section>
  );
}
