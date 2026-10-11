import type { z } from "zod";
import type { processTemplateSchema } from "@/schemas/template.schema";

/** A sparse map of PM2 option keys to initial values. */
export type TemplateValues = Record<string, unknown>;

export type ProcessTemplate = z.infer<typeof processTemplateSchema>;

/** Payload accepted by POST /templates. */
export interface TemplateInput {
  template_name: string;
  category: string | null;
  description: string | null;
  preview: string | null;
  is_active: boolean;
  values: TemplateValues;
}
