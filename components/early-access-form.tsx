"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { FadeIn } from "@/components/fade-in";
import { earlyAccessSchema, type EarlyAccessFormValues } from "@/lib/validations";
import { PRODUCT_CATEGORIES } from "@/lib/constants";

export function EarlyAccessForm() {
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EarlyAccessFormValues>({
    resolver: zodResolver(earlyAccessSchema),
  });

  const onSubmit = async (data: EarlyAccessFormValues) => {
    // Persisted to localStorage for now. Replace this block with a request to
    // a real API endpoint once one exists, e.g.:
    // await fetch("/api/early-access", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(data),
    // });
    const existing = JSON.parse(localStorage.getItem("bazi_early_access_submissions") ?? "[]");
    existing.push({ ...data, submittedAt: new Date().toISOString() });
    localStorage.setItem("bazi_early_access_submissions", JSON.stringify(existing));

    console.log("Early access request submitted:", data);

    setIsSubmitted(true);
    reset();
  };

  return (
    <section id="early-access" className="bg-offwhite py-24 md:py-32">
      <div className="mx-auto w-full max-w-3xl px-6 md:px-10">
        <FadeIn className="text-center">
          <h2 className="font-display text-3xl font-medium tracking-tight text-navy sm:text-4xl">
            Build a therapeutic experience that adapts.
          </h2>
          <p className="mt-4 text-base text-navy/65 sm:text-lg">
            For digital therapeutics companies, clinical collaborators, and pilot partners.
          </p>
        </FadeIn>

        <FadeIn delay={0.1} className="mt-12">
          {isSubmitted ? (
            <div className="flex flex-col items-center gap-4 rounded-sm border border-steel-200 bg-white px-8 py-16 text-center">
              <CheckCircle2 size={40} className="text-green" aria-hidden="true" />
              <h3 className="font-display text-xl font-medium text-navy">Request received</h3>
              <p className="max-w-sm text-sm text-navy/65">
                Thanks for reaching out. Our team will follow up at the email address you provided.
              </p>
              <button
                type="button"
                onClick={() => setIsSubmitted(false)}
                className="mt-2 text-sm font-medium text-navy underline underline-offset-4"
              >
                Submit another request
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="rounded-sm border border-steel-200 bg-white p-6 sm:p-10">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-navy">
                    Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    autoComplete="name"
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? "name-error" : undefined}
                    className="mt-2 w-full rounded-sm border border-steel-200 bg-offwhite px-4 py-2.5 text-sm text-navy outline-none focus:border-navy"
                    {...register("name")}
                  />
                  {errors.name && (
                    <p id="name-error" className="mt-1.5 text-xs text-red-600">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-navy">
                    Work email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "email-error" : undefined}
                    className="mt-2 w-full rounded-sm border border-steel-200 bg-offwhite px-4 py-2.5 text-sm text-navy outline-none focus:border-navy"
                    {...register("email")}
                  />
                  {errors.email && (
                    <p id="email-error" className="mt-1.5 text-xs text-red-600">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-navy">
                    Company
                  </label>
                  <input
                    id="company"
                    type="text"
                    autoComplete="organization"
                    aria-invalid={!!errors.company}
                    aria-describedby={errors.company ? "company-error" : undefined}
                    className="mt-2 w-full rounded-sm border border-steel-200 bg-offwhite px-4 py-2.5 text-sm text-navy outline-none focus:border-navy"
                    {...register("company")}
                  />
                  {errors.company && (
                    <p id="company-error" className="mt-1.5 text-xs text-red-600">
                      {errors.company.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-navy">
                    Role
                  </label>
                  <input
                    id="role"
                    type="text"
                    autoComplete="organization-title"
                    aria-invalid={!!errors.role}
                    aria-describedby={errors.role ? "role-error" : undefined}
                    className="mt-2 w-full rounded-sm border border-steel-200 bg-offwhite px-4 py-2.5 text-sm text-navy outline-none focus:border-navy"
                    {...register("role")}
                  />
                  {errors.role && (
                    <p id="role-error" className="mt-1.5 text-xs text-red-600">
                      {errors.role.message}
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="productCategory" className="block text-sm font-medium text-navy">
                    Product category
                  </label>
                  <select
                    id="productCategory"
                    defaultValue=""
                    aria-invalid={!!errors.productCategory}
                    aria-describedby={errors.productCategory ? "productCategory-error" : undefined}
                    className="mt-2 w-full rounded-sm border border-steel-200 bg-offwhite px-4 py-2.5 text-sm text-navy outline-none focus:border-navy"
                    {...register("productCategory")}
                  >
                    <option value="" disabled>
                      Select a category
                    </option>
                    {PRODUCT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  {errors.productCategory && (
                    <p id="productCategory-error" className="mt-1.5 text-xs text-red-600">
                      {errors.productCategory.message}
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="details" className="block text-sm font-medium text-navy">
                    What are you building?
                  </label>
                  <textarea
                    id="details"
                    rows={4}
                    aria-invalid={!!errors.details}
                    aria-describedby={errors.details ? "details-error" : undefined}
                    className="mt-2 w-full rounded-sm border border-steel-200 bg-offwhite px-4 py-2.5 text-sm text-navy outline-none focus:border-navy"
                    {...register("details")}
                  />
                  {errors.details && (
                    <p id="details-error" className="mt-1.5 text-xs text-red-600">
                      {errors.details.message}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-8 inline-flex w-full items-center justify-center rounded-sm bg-navy px-6 py-3.5 text-sm font-medium text-offwhite transition-colors hover:bg-navy-deep disabled:opacity-60 sm:w-auto"
              >
                {isSubmitting ? "Submitting..." : "Request early access"}
              </button>
            </form>
          )}
        </FadeIn>
      </div>
    </section>
  );
}
