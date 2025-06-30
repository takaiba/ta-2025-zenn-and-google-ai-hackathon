"use client";

import { useRouter } from "next/navigation";

import { toast } from "@/app/_components/common/ToastPosition";
import { api } from "@/trpc/react";

import { Presentation } from "./presentation";

import type { CreateProjectInput } from "./schema";

type Props = {
  onClose: () => void;
};

export const CreateProjectModal = ({ onClose }: Props) => {
  const router = useRouter();
  const createProject = api.project.create.useMutation({
    onSuccess: (data) => {
      toast("プロジェクトを作成しました", { type: "success" });
      onClose();
      router.push(`/projects/${data.id}`);
    },
    onError: (error) => {
      toast(error.message || "プロジェクトの作成に失敗しました", { type: "error" });
    },
  });

  const handleSubmit = (data: CreateProjectInput) => {
    createProject.mutate(data);
  };

  return (
    <Presentation
      onSubmit={handleSubmit}
      onClose={onClose}
      isLoading={createProject.isPending}
    />
  );
};