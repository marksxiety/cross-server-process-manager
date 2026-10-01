import type { z } from "zod";
import type { processTemplateSchema, templateKeySchema } from "@/schemas/template.schema";

export type TemplateKey = z.infer<typeof templateKeySchema>;
export type ProcessTemplate = z.infer<typeof processTemplateSchema>;
export type TemplateDataType = TemplateKey["data_type"];
