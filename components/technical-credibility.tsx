import { Container } from "@/components/container";
import { SectionHeading } from "@/components/section-heading";
import { FadeIn } from "@/components/fade-in";

const CAPABILITIES = [
  "Multimodal behavioral signal processing",
  "Time-series disengagement prediction",
  "Contextual decision models",
  "Constrained intervention selection",
  "On-device model deployment",
  "Auditable decisions and versioned models",
  "Human-defined treatment boundaries",
  "Privacy and security controls",
];

export function TechnicalCredibility() {
  return (
    <section className="bg-navy-deep py-24 md:py-32">
      <Container>
        <SectionHeading eyebrow="Technical credibility" title="Designed for clinically constrained AI." light />

        <div className="mt-14 grid gap-px overflow-hidden rounded-sm border border-offwhite/10 bg-offwhite/10 sm:grid-cols-2 lg:grid-cols-4">
          {CAPABILITIES.map((item, i) => (
            <FadeIn key={item} delay={(i % 4) * 0.06}>
              <div className="h-full bg-navy-deep p-6">
                <p className="text-sm leading-relaxed text-offwhite/80">{item}</p>
              </div>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={0.2} className="mt-12 max-w-2xl border-l-2 border-green pl-5">
          <p className="text-sm leading-relaxed text-offwhite/70 sm:text-base">
            Bazi does not diagnose patients or independently prescribe treatment. It operates
            within intervention boundaries defined by the therapeutic provider.
          </p>
        </FadeIn>
      </Container>
    </section>
  );
}
