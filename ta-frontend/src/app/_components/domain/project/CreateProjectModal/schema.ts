import { z } from "zod";

export const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, "プロジェクト名は必須です")
    .max(100, "プロジェクト名は100文字以内で入力してください"),
  description: z
    .string()
    .max(500, "説明は500文字以内で入力してください")
    .optional(),
  url: z
    .string()
    .url("有効なURLを入力してください")
    .min(1, "URLは必須です"),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;