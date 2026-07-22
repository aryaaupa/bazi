import { z } from "zod";

export const earlyAccessSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name"),
  email: z.string().trim().email("Enter a valid work email"),
  company: z.string().trim().min(2, "Enter your company name"),
  role: z.string().trim().min(2, "Enter your role"),
  productCategory: z.enum(
    [
      "Mental health",
      "Physical rehabilitation",
      "Neurological care",
      "Chronic disease",
      "Pain management",
      "Other",
    ],
    { errorMap: () => ({ message: "Select a product category" }) }
  ),
  details: z.string().trim().min(10, "Tell us a bit more, at least 10 characters"),
});

export type EarlyAccessFormValues = z.infer<typeof earlyAccessSchema>;
