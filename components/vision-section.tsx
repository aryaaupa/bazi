import { Container } from "@/components/container";
import { FadeIn } from "@/components/fade-in";

const CATEGORIES = ["Mental health", "Physical rehabilitation", "Neurological care", "Chronic disease", "Pain management"];

export function VisionSection() {
  return (
    <section id="company" className="relative overflow-hidden bg-navy py-24 md:py-32">
      <Container>
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center lg:gap-12">
          <FadeIn>
            <p className="mb-4 font-mono text-xs font-medium uppercase tracking-[0.14em] text-green">Vision</p>
            <h2 className="font-display text-3xl font-medium leading-tight tracking-tight text-offwhite sm:text-4xl md:text-[2.75rem]">
              The intelligence layer behind software-based medicine.
            </h2>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-offwhite/70 sm:text-lg">
              Software is becoming a treatment modality, but most therapeutic software still
              behaves like a fixed program. Bazi is building the adaptive infrastructure that
              allows digital treatment to respond to each patient as they change.
            </p>
          </FadeIn>

          <FadeIn delay={0.15}>
            <svg
              viewBox="0 0 480 340"
              className="w-full"
              role="img"
              aria-label="Diagram showing five therapeutic categories connecting into a single Bazi adaptive intelligence layer"
            >
              {CATEGORIES.map((cat, i) => {
                const x = 40 + i * 100;
                return (
                  <g key={cat}>
                    <rect x={x - 42} y={20} width={84} height={44} rx={4} fill="none" stroke="#F7F8F3" strokeOpacity={0.25} strokeWidth={1} />
                    <text x={x} y={46} textAnchor="middle" className="fill-offwhite/70" style={{ font: "500 10px var(--font-mono), monospace" }}>
                      {cat.split(" ")[0]}
                    </text>
                    <path d={`M${x},64 C${x},110 240,110 240,150`} fill="none" stroke="#55E889" strokeOpacity={0.4} strokeWidth={1} />
                  </g>
                );
              })}

              <rect x={20} y={150} width={440} height={70} rx={4} fill="#55E889" fillOpacity={0.1} stroke="#55E889" strokeWidth={1} />
              <text x={240} y={190} textAnchor="middle" className="fill-green" style={{ font: "500 13px var(--font-mono), monospace" }}>
                Bazi adaptive intelligence layer
              </text>

              <path d="M240,220 C240,260 240,260 240,300" fill="none" stroke="#F7F8F3" strokeOpacity={0.25} strokeWidth={1} />
              <rect x={140} y={300} width={200} height={36} rx={4} fill="none" stroke="#F7F8F3" strokeOpacity={0.25} strokeWidth={1} />
              <text x={240} y={322} textAnchor="middle" className="fill-offwhite/70" style={{ font: "500 10px var(--font-mono), monospace" }}>
                Personalized therapeutic experience
              </text>
            </svg>
          </FadeIn>
        </div>
      </Container>
    </section>
  );
}
