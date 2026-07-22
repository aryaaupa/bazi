export function CodePanel() {
  return (
    <div className="overflow-hidden rounded-sm border border-offwhite/10 bg-navy">
      <div className="flex items-center gap-2 border-b border-offwhite/10 px-5 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-offwhite/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-offwhite/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-offwhite/20" />
        <span className="ml-3 font-mono text-xs text-offwhite/50">integration.ts</span>
      </div>
      <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-relaxed">
        <code>
          <span className="font-medium text-offwhite">import</span>{" "}
          <span className="text-offwhite/80">{"{ Bazi }"}</span>{" "}
          <span className="font-medium text-offwhite">from</span>{" "}
          <span className="text-green">&quot;@bazi/sdk&quot;</span>
          {";\n\n"}
          <span className="font-medium text-offwhite">const</span>{" "}
          <span className="text-offwhite/80">bazi</span>{" "}
          <span className="text-offwhite/50">=</span>{" "}
          <span className="font-medium text-offwhite">new</span>{" "}
          <span className="text-offwhite/80">Bazi</span>
          <span className="text-offwhite/50">{"({"}</span>
          {"\n  "}
          <span className="text-offwhite/70">therapyId:</span>{" "}
          <span className="text-green">&quot;rehab-program&quot;</span>
          {",\n  "}
          <span className="text-offwhite/70">mode:</span>{" "}
          <span className="text-green">&quot;on-device&quot;</span>
          {"\n"}
          <span className="text-offwhite/50">{"});"}</span>
          {"\n\n"}
          <span className="font-medium text-offwhite">const</span>{" "}
          <span className="text-offwhite/80">decision</span>{" "}
          <span className="text-offwhite/50">=</span>{" "}
          <span className="font-medium text-offwhite">await</span>{" "}
          <span className="text-offwhite/80">bazi.recommend</span>
          <span className="text-offwhite/50">{"({"}</span>
          {"\n  "}
          <span className="text-offwhite/70">engagementSignals,</span>
          {"\n  "}
          <span className="text-offwhite/70">treatmentProgress,</span>
          {"\n  "}
          <span className="text-offwhite/70">approvedInterventions,</span>
          {"\n"}
          <span className="text-offwhite/50">{"});"}</span>
          {"\n\n"}
          <span className="text-offwhite/80">renderIntervention</span>
          <span className="text-offwhite/50">(</span>
          <span className="text-offwhite/80">decision.nextIntervention</span>
          <span className="text-offwhite/50">);</span>
        </code>
      </pre>
    </div>
  );
}
