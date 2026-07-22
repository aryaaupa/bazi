import Link from "next/link";

interface LogoProps {
  variant?: "light" | "dark";
  className?: string;
}

export function LogoMark({ variant = "light", className }: LogoProps) {
  const color = variant === "dark" ? "#F7F8F3" : "#071A2B";
  return (
    <svg viewBox="0 0 40 40" width="30" height="30" className={className} aria-hidden="true" focusable="false">
      <rect x="6" y="6" width="7" height="28" rx="3.5" fill={color} />
      <circle cx="22" cy="13" r="9" fill="none" stroke={color} strokeWidth="7" />
      <circle cx="20" cy="27" r="7" fill="none" stroke={color} strokeWidth="6" />
    </svg>
  );
}

export function Logo({ variant = "light", className }: LogoProps) {
  const textColor = variant === "dark" ? "text-offwhite" : "text-navy";
  return (
    <Link href="/" className={`flex items-center gap-2.5 ${className ?? ""}`} aria-label="Bazi home">
      <LogoMark variant={variant} />
      <span className={`font-display text-xl font-medium tracking-tight ${textColor}`}>Bazi</span>
    </Link>
  );
}
