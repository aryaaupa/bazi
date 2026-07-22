import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export const metadata = { title: "Privacy | Bazi" };

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="bg-offwhite py-24 md:py-32">
        <div className="mx-auto w-full max-w-3xl px-6 md:px-10">
          <h1 className="font-display text-3xl font-medium text-navy sm:text-4xl">Privacy</h1>
          <p className="mt-6 text-base leading-relaxed text-navy/70">
            Bazi is in active development. Our full privacy policy will be published here ahead
            of general availability. For questions about how data is handled today, contact us
            at hello@bazi.health.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
