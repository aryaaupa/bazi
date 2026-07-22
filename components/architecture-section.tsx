import { Container } from "@/components/container";
import { SectionHeading } from "@/components/section-heading";
import { FadeIn } from "@/components/fade-in";
import { CodePanel } from "@/components/code-panel";
import { Cpu, ShieldCheck, Zap, SlidersHorizontal, Network, Boxes } from "lucide-react";

const STAGES = [
  "Existing therapeutic application",
  "Bazi SDK",
  "Signal processing",
  "Disengagement prediction",
  "Adaptive decision engine",
  "Approved intervention library",
  "Personalized therapeutic experience",
];

const CAPABILITIES = [
  { icon: Cpu, label: "On-device inference where appropriate" },
  { icon: ShieldCheck, label: "Privacy-conscious data handling" },
  { icon: Zap, label: "Low-latency decisions" },
  { icon: SlidersHorizontal, label: "Clinically constrained intervention selection" },
  { icon: Boxes, label: "Configurable integration" },
  { icon: Network, label: "Federated learning as a future capability" },
];

export function ArchitectureSection() {
  return (
    <section id="technology" className="bg-navy-deep py-24 md:py-32">
      <Container>
        <SectionHeading
          eyebrow="Product architecture"
          title="Built to integrate, not replace."
          description="Bazi is an SDK and API layer for existing digital therapeutics. It adds an adaptive decision layer without requiring you to rebuild your product."
          light
        />

        <div className="mt-16 grid gap-14 lg:grid-cols-2 lg:gap-16">
          <FadeIn>
            <ol className="space-y-0">
              {STAGES.map((stage, i) => (
                <li key={stage} className="relative flex items-start gap-4 pb-8 last:pb-0">
                  {i < STAGES.length - 1 && (
                    <span className="absolute left-[15px] top-8 h-full w-px bg-offwhite/15" aria-hidden="true" />
                  )}
                  <span className="relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-green/40 bg-navy-deep font-mono text-xs text-green">
                    {i + 1}
                  </span>
                  <span className="pt-1 text-sm text-offwhite/85 sm:text-base">{stage}</span>
                </li>
              ))}
            </ol>
          </FadeIn>

          <FadeIn delay={0.1}>
            <CodePanel />
            <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {CAPABILITIES.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-start gap-2.5 text-sm text-offwhite/70">
                  <Icon size={16} className="mt-0.5 shrink-0 text-green" aria-hidden="true" />
                  {label}
                </li>
              ))}
            </ul>
          </FadeIn>
        </div>
      </Container>
    </section>
  );
}
