import { FadeIn } from "@/components/fade-in";
import { EngagementVisualization } from "@/components/engagement-visualization";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-navy-deep">
      <div className="pointer-events-none absolute inset-0 opacity-[0.06]" aria-hidden="true">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#F7F8F3" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="relative mx-auto grid w-full max-w-content gap-16 px-6 pb-20 pt-16 md:px-10 md:pb-28 md:pt-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-12">
        <FadeIn>
          <p className="mb-6 font-mono text-xs font-medium uppercase tracking-[0.16em] text-green">
            Adaptive AI for digital therapeutics
          </p>
          <h1 className="font-display text-4xl font-medium leading-[1.08] tracking-tight text-offwhite sm:text-5xl md:text-[3.4rem]">
            Digital therapeutics are static. Patients are not.
          </h1>
          <p className="mt-7 max-w-xl text-base leading-relaxed text-offwhite/70 sm:text-lg">
            Bazi predicts when a patient is beginning to disengage and adapts the therapeutic
            experience in real time. We help digital health companies turn fixed treatment paths
            into personalized software-based care.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a
              href="#early-access"
              className="inline-flex items-center justify-center rounded-sm bg-green px-6 py-3.5 text-sm font-medium text-navy-deep transition-transform hover:-translate-y-0.5"
            >
              Request early access
            </a>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center rounded-sm border border-offwhite/25 px-6 py-3.5 text-sm font-medium text-offwhite transition-colors hover:border-offwhite/50"
            >
              See how it works
            </a>
          </div>
        </FadeIn>

        <FadeIn delay={0.15}>
          <EngagementVisualization />
        </FadeIn>
      </div>
    </section>
  );
}
