import { z } from "zod";

export const editProjectSchema = z.object({
  name: z.string().min(1, "プロジェクト名は必須です").max(100),
  description: z.string().optional(),
  url: z.string().url("有効なURLを入力してください"),
});

export type EditProjectInput = z.infer<typeof editProjectSchema>;