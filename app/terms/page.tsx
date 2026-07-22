import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export const metadata = { title: "Terms | Bazi" };

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="bg-offwhite py-24 md:py-32">
        <div className="mx-auto w-full max-w-3xl px-6 md:px-10">
          <h1 className="font-display text-3xl font-medium text-navy sm:text-4xl">Terms</h1>
          <p className="mt-6 text-base leading-relaxed text-navy/70">
            Bazi&apos;s terms of service will be published here ahead of general availability.
            For questions in the meantime, contact us at hello@bazi.health.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
