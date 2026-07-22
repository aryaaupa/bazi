"use client";

import { motion, useReducedMotion } from "framer-motion";

const predictedPath = "M40,90 C140,110 220,150 340,230 C400,270 440,290 520,300";
const adaptedPath = "M40,90 C140,110 220,150 300,190 C340,150 400,110 460,96 C480,92 500,90 520,84";

export function EngagementVisualization() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="rounded-sm border border-offwhite/10 bg-navy p-5 sm:p-7">
      <div className="mb-6 flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-offwhite/50">
          Patient engagement timeline
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-offwhite/50">
          Weeks 1 to 6
        </span>
      </div>

      <svg
        viewBox="0 0 560 340"
        className="w-full"
        role="img"
        aria-label="Chart comparing predicted patient disengagement with engagement adapted by Bazi after an intervention is selected"
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <line
            key={i}
            x1={40}
            x2={520}
            y1={40 + i * 65}
            y2={40 + i * 65}
            stroke="#F7F8F3"
            strokeOpacity={0.08}
            strokeWidth={1}
          />
        ))}

        <motion.path
          d={predictedPath}
          fill="none"
          stroke="#66727C"
          strokeWidth={2}
          strokeDasharray="5 6"
          initial={shouldReduceMotion ? undefined : { pathLength: 0 }}
          whileInView={shouldReduceMotion ? undefined : { pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: "easeInOut" }}
        />

        <motion.path
          d={adaptedPath}
          fill="none"
          stroke="#55E889"
          strokeWidth={2.5}
          initial={shouldReduceMotion ? undefined : { pathLength: 0 }}
          whileInView={shouldReduceMotion ? undefined : { pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.6, ease: "easeInOut", delay: 0.2 }}
        />

        <circle cx={300} cy={190} r={5} fill="#55E889" />
        <circle
          cx={300}
          cy={190}
          r={5}
          fill="none"
          stroke="#55E889"
          strokeWidth={1.5}
          className="motion-safe:animate-ping"
          style={{ transformOrigin: "300px 190px" }}
        />

        <text x={150} y={128} className="fill-offwhite/60" style={{ font: "500 11px var(--font-mono), monospace" }}>
          Engagement risk
        </text>

        <line x1={300} y1={190} x2={300} y2={228} stroke="#F7F8F3" strokeOpacity={0.25} strokeWidth={1} strokeDasharray="2 3" />
        <text x={224} y={244} className="fill-green" style={{ font: "500 11px var(--font-mono), monospace" }}>
          Intervention selected
        </text>

        <text x={392} y={78} className="fill-offwhite/80" style={{ font: "500 11px var(--font-mono), monospace" }}>
          Treatment adapted
        </text>
      </svg>

      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-offwhite/10 pt-5">
        <span className="flex items-center gap-2 text-xs text-offwhite/60">
          <span className="h-0.5 w-4 bg-green" /> Bazi-adapted engagement
        </span>
        <span className="flex items-center gap-2 text-xs text-offwhite/60">
          <span className="h-0.5 w-4 border-t border-dashed border-gray" /> Predicted without Bazi
        </span>
      </div>
    </div>
  );
}
