import { Logo } from "@/components/logo";
import { Container } from "@/components/container";
import { NAV_LINKS } from "@/lib/constants";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-navy-deep pt-20">
      <Container>
        <div className="grid gap-10 border-b border-offwhite/10 pb-14 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <Logo variant="dark" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-offwhite/60">
              Adaptive intelligence for software-based medicine.
            </p>
          </div>

          <div>
            <p className="font-mono text-xs uppercase tracking-[0.1em] text-offwhite/40">Site</p>
            <ul className="mt-4 space-y-3">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-offwhite/70 hover:text-offwhite">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-mono text-xs uppercase tracking-[0.1em] text-offwhite/40">Contact</p>
            <ul className="mt-4 space-y-3">
              <li>
                <a href="mailto:hello@bazi.health" className="text-sm text-offwhite/70 hover:text-offwhite">
                  hello@bazi.health
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="font-mono text-xs uppercase tracking-[0.1em] text-offwhite/40">Legal</p>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href="/privacy" className="text-sm text-offwhite/70 hover:text-offwhite">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-offwhite/70 hover:text-offwhite">
                  Terms
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-3 py-8 text-xs text-offwhite/40 sm:flex-row sm:items-center sm:justify-between">
          <p>Bazi is currently under development and is not intended for direct clinical use.</p>
          <p>&copy; {new Date().getFullYear()} Bazi</p>
        </div>
      </Container>
    </footer>
  );
}
