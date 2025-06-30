"use client";

import { toast } from "@/app/_components/common/ToastPosition";
import { api } from "@/trpc/react";

import { Presentation } from "./presentation";

import type { EditProjectInput } from "./schema";

type Props = {
  projectId: string;
  initialData: {
    name: string;
    description?: string | null;
    url: string;
  };
  onClose: () => void;
};

export const EditProjectModal = ({ projectId, initialData, onClose }: Props) => {
  const utils = api.useUtils();
  
  const updateProject = api.project.update.useMutation({
    onSuccess: async () => {
      toast("プロジェクトを更新しました", { type: "success" });
      await utils.project.get.invalidate({ id: projectId });
      onClose();
    },
    onError: (error) => {
      toast(error.message || "プロジェクトの更新に失敗しました", { type: "error" });
    },
  });

  const handleSubmit = (data: EditProjectInput) => {
    updateProject.mutate({
      id: projectId,
      ...data,
    });
  };

  return (
    <Presentation
      initialData={initialData}
      onSubmit={handleSubmit}
      onClose={onClose}
      isLoading={updateProject.isPending}
    />
  );
};