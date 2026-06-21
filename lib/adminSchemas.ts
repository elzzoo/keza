import { z } from "zod";

// Admin config schemas
export const trialReminderDaysSchema = z.object({
  days: z.number().int().min(0).max(30),
});

export const updateMilesPriceSchema = z.object({
  program: z.string().min(1),
  valueCents: z.number().min(0.1).max(10),
}).partial().refine(
  (data) => data.program !== undefined || data.valueCents === undefined,
  { message: "program is required when valueCents is provided" }
);

export const updateMilesPricesSchema = z.object({
  program: z.string().min(1).optional(),
  valueCents: z.number().min(0.1).max(10).optional(),
  programs: z.record(z.string(), z.number().min(0.1).max(10)).optional(),
}).refine(
  (data) => (data.program && data.valueCents) || data.programs,
  { message: "Either 'program'+'valueCents' or 'programs' must be provided" }
);
