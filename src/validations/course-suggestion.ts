import { languageEnum } from "@/types/language";
import { z } from "zod";

function createZodEnum<T extends string>(values: T[]) {
  return z.enum(values as [T, ...T[]]);
}

export const courseSuggestionSchema = z.object({
  subject: z.string().min(3, "Subject must be at least 3 characters"),
  audience: z.string().min(3, "Audience must be at least 3 characters"),
  goals: z.string().optional(),
  verifiedBy: z.string().optional(),
  language: createZodEnum(languageEnum),
});

export type CourseSuggestionInput = z.infer<typeof courseSuggestionSchema>;

export const courseSuggestionSelectedSchema = z.object({
    selected: z.number()
});

export type CourseSuggestionSelectedInput = z.infer<typeof courseSuggestionSelectedSchema>;
