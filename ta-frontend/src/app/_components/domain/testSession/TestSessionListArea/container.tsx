"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { toast } from "@/app/_components/common/ToastPosition";
import { useDebounce } from "@/hooks/useDebounce";
import { api } from "@/trpc/react";

import { TestSessionListAreaPresentation } from "./presentation";

type Props = {
  projectId: string;
};

export const TestSessionListArea = ({ projectId }: Props) => {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  
  // statusFilterの変更をデバウンス
  const debouncedStatusFilter = useDebounce(statusFilter, 300);
  
  const { data: project } = api.project.get.useQuery({ id: projectId });
  
  // セッションデータを取得（ポーリングの設定は一度だけ行う）
  const { data: sessions, isLoading } = api.testSession.getAllByProject.useQuery({
    projectId,
    status: debouncedStatusFilter === "all" ? undefined : debouncedStatusFilter as "pending" | "running" | "completed" | "failed",
  }, {
    // 実行中のセッションがある場合は自動更新
    refetchInterval: 3000,
    // スタンバイ時間を設定して無駄なリクエストを防ぐ
    staleTime: 5000,
  });
  
  // 実行中のジョブの統計情報を取得
  const { data: jobStats } = api.jobQueue.getStats.useQuery(undefined, {
    refetchInterval: 10000, // 10秒ごとに更新
    staleTime: 5000,
  });

  const utils = api.useUtils();
  
  // Delete mutation
  const deleteSessionMutation = api.testSession.delete.useMutation({
    onSuccess: async () => {
      // キャッシュを無効化して再取得
      await utils.testSession.getAllByProject.invalidate({ projectId });
      toast("テストセッションを削除しました", { type: "success" });
      setShowDeleteConfirm(false);
      setSessionToDelete(null);
      setDeletingSessionId(null);
    },
    onError: (error) => {
      toast(error.message || "テストセッションの削除に失敗しました", { type: "error" });
      setDeletingSessionId(null);
    },
  });

  const handleDeleteClick = (sessionId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSessionToDelete(sessionId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!sessionToDelete) return;
    
    setDeletingSessionId(sessionToDelete);
    await deleteSessionMutation.mutateAsync({ id: sessionToDelete });
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setSessionToDelete(null);
  };

  return (
    <TestSessionListAreaPresentation
      project={project}
      sessions={sessions}
      isLoading={isLoading}
      statusFilter={statusFilter}
      onStatusFilterChange={setStatusFilter}
      jobStats={jobStats}
      onDeleteClick={handleDeleteClick}
      deletingSessionId={deletingSessionId}
      showDeleteConfirm={showDeleteConfirm}
      sessionToDelete={sessionToDelete}
      onConfirmDelete={confirmDelete}
      onCancelDelete={cancelDelete}
    />
  );
};