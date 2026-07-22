import { Container } from "@/components/container";
import { SectionHeading } from "@/components/section-heading";
import { FadeIn } from "@/components/fade-in";

const AUDIENCE = [
  "Digital therapeutics companies",
  "Virtual care platforms",
  "Rehabilitation technology companies",
  "Behavioral health platforms",
  "Research and clinical innovation teams",
];

const VALUE_PROPS = [
  "Improve engagement",
  "Increase treatment adherence",
  "Personalize patient journeys",
  "Learn which interventions work for different users",
  "Add adaptive intelligence without rebuilding the core application",
];

export function CustomersSection() {
  return (
    <section className="bg-offwhite pb-24 md:pb-32">
      <Container>
        <SectionHeading eyebrow="Who it's for" title="Built for digital health teams that already have a therapeutic product." />

        <div className="mt-14 grid gap-12 lg:grid-cols-2 lg:gap-16">
          <FadeIn>
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-navy/50">Audience</p>
            <ul className="mt-5 space-y-3">
              {AUDIENCE.map((item) => (
                <li key={item} className="border-b border-steel-200 py-3 text-sm text-navy/75 sm:text-base">
                  {item}
                </li>
              ))}
            </ul>
          </FadeIn>

          <FadeIn delay={0.1}>
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-navy/50">What Bazi adds</p>
            <ul className="mt-5 space-y-3">
              {VALUE_PROPS.map((item) => (
                <li key={item} className="border-b border-steel-200 py-3 text-sm text-navy/75 sm:text-base">
                  {item}
                </li>
              ))}
            </ul>
          </FadeIn>
        </div>
      </Container>
    </section>
  );
}
