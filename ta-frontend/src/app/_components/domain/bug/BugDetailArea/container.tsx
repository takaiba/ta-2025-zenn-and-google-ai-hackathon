"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { toast } from "@/app/_components/common/ToastPosition";
import { api } from "@/trpc/react";

import { BugDetailAreaPresentation } from "./presentation";


type Props = {
  projectId: string;
  bugId: string;
};

export const BugDetailArea = ({ projectId, bugId }: Props) => {
  const _router = useRouter();
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  
  const { data: project } = api.project.get.useQuery({ id: projectId });
  const { data: bug, isLoading, refetch: refetchBug } = api.bugTicket.get.useQuery({ id: bugId });
  const { data: comments, refetch: refetchComments } = api.bugTicket.getComments.useQuery({ bugId });
  
  const updateStatus = api.bugTicket.update.useMutation({
    onSuccess: () => {
      toast("ステータスを更新しました", { type: "success" });
      void refetchBug();
    },
    onError: (error) => {
      toast("ステータスの更新に失敗しました", { type: "error" });
      console.error(error);
    },
  });

  const addComment = api.bugTicket.addComment.useMutation({
    onSuccess: () => {
      toast("コメントを追加しました", { type: "success" });
      setCommentText("");
      void refetchComments();
      void refetchBug();
    },
    onError: (error) => {
      toast("コメントの追加に失敗しました", { type: "error" });
      console.error(error);
    },
  });

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdatingStatus(true);
    try {
      await updateStatus.mutateAsync({
        id: bugId,
        status: newStatus as "open" | "in_progress" | "resolved" | "closed" | "false_positive",
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    
    setIsSubmittingComment(true);
    try {
      await addComment.mutateAsync({
        bugId,
        content: commentText,
      });
    } finally {
      setIsSubmittingComment(false);
    }
  };

  return (
    <BugDetailAreaPresentation
      project={project}
      bug={bug}
      comments={comments}
      isLoading={isLoading}
      commentText={commentText}
      setCommentText={setCommentText}
      isSubmittingComment={isSubmittingComment}
      isUpdatingStatus={isUpdatingStatus}
      onStatusChange={handleStatusChange}
      onAddComment={handleAddComment}
    />
  );
};