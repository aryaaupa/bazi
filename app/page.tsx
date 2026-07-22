import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { ProblemSection } from "@/components/problem-section";
import { HowItWorks } from "@/components/how-it-works";
import { ArchitectureSection } from "@/components/architecture-section";
import { ApplicationsSection } from "@/components/applications-section";
import { DifferentiationSection } from "@/components/differentiation-section";
import { CustomersSection } from "@/components/customers-section";
import { TechnicalCredibility } from "@/components/technical-credibility";
import { VisionSection } from "@/components/vision-section";
import { EarlyAccessForm } from "@/components/early-access-form";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main id="main-content">
        <Hero />
        <ProblemSection />
        <HowItWorks />
        <ArchitectureSection />
        <ApplicationsSection />
        <DifferentiationSection />
        <CustomersSection />
        <TechnicalCredibility />
        <VisionSection />
        <EarlyAccessForm />
      </main>
      <Footer />
    </>
  );
}
