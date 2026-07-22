import { FadeIn } from "@/components/fade-in";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  light = false,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  light?: boolean;
}) {
  return (
    <FadeIn className={align === "center" ? "text-center" : "text-left"}>
      {eyebrow && (
        <p
          className={`mb-4 font-mono text-xs font-medium uppercase tracking-[0.14em] ${
            light ? "text-green" : "text-navy/60"
          }`}
        >
          {eyebrow}
        </p>
      )}
      <h2
        className={`font-display text-3xl font-medium tracking-tight sm:text-4xl md:text-[2.75rem] ${
          light ? "text-offwhite" : "text-navy"
        }`}
      >
        {title}
      </h2>
      {description && (
        <p
          className={`mt-5 max-w-2xl text-base leading-relaxed sm:text-lg ${
            align === "center" ? "mx-auto" : ""
          } ${light ? "text-offwhite/70" : "text-navy/70"}`}
        >
          {description}
        </p>
      )}
    </FadeIn>
  );
}
