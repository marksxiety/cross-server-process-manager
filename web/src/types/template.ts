import type { z } from "zod";
import type { processTemplateSchema, templateKeySchema } from "@/schemas/template.schema";

export type TemplateKey = z.infer<typeof templateKeySchema>;
export type ProcessTemplate = z.infer<typeof processTemplateSchema>;
export type TemplateDataType = TemplateKey["data_type"];

/** Payload accepted by POST /templates. */
export interface TemplateInput {
  template_name: string;
  category: string | null;
  description: string | null;
  preview: string | null;
  is_active: boolean;
  keys: TemplateKey[];
}
