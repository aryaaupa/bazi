"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { NAV_LINKS } from "@/lib/constants";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const isDark = !isScrolled && !isOpen;

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b transition-colors duration-300 ${
        isScrolled || isOpen
          ? "border-steel-200 bg-offwhite/90 backdrop-blur-md"
          : "border-offwhite/10 bg-transparent"
      }`}
    >
      <nav
        className="mx-auto flex w-full max-w-content items-center justify-between px-6 py-4 md:px-10"
        aria-label="Primary"
      >
        <Logo variant={isDark ? "dark" : "light"} />

        <ul className="hidden items-center gap-9 md:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  isDark ? "text-offwhite/75 hover:text-offwhite" : "text-navy/75 hover:text-navy"
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden md:block">
          <Link
            href="/#early-access"
            className={`inline-flex items-center rounded-sm border px-5 py-2.5 text-sm font-medium transition-colors ${
              isDark
                ? "border-green bg-green text-navy-deep hover:bg-green-pale"
                : "border-navy bg-navy text-offwhite hover:bg-navy-deep"
            }`}
          >
            Request early access
          </Link>
        </div>

        <button
          type="button"
          className={`inline-flex h-10 w-10 items-center justify-center rounded-sm md:hidden ${
            isDark ? "text-offwhite" : "text-navy"
          }`}
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-expanded={isOpen}
          aria-controls="mobile-menu"
          onClick={() => setIsOpen((v) => !v)}
        >
          {isOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="mobile-menu"
            initial={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { height: "auto", opacity: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-b border-steel-200 bg-offwhite md:hidden"
          >
            <ul className="flex flex-col gap-1 px-6 py-4">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="block rounded-sm px-2 py-3 text-base font-medium text-navy"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li className="mt-2">
                <Link
                  href="/#early-access"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center rounded-sm bg-navy px-5 py-3 text-sm font-medium text-offwhite"
                >
                  Request early access
                </Link>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
