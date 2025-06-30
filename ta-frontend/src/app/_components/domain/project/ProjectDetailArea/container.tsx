"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { toast } from "@/app/_components/common/ToastPosition";
import { api } from "@/trpc/react";

import { Presentation } from "./presentation";

type Props = {
  projectId: string;
};

export const ProjectDetailArea = ({ projectId }: Props) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "tests" | "bugs" | "settings">("overview");
  const [isTestConfigModalOpen, setIsTestConfigModalOpen] = useState(false);
  const [isStartTestModalOpen, setIsStartTestModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const { data: project, isLoading: projectLoading } = api.project.get.useQuery(
    { id: projectId },
    { staleTime: 30000 } // 30秒間キャッシュ
  );
  const { data: testSessions, isLoading: sessionsLoading } = api.testSession.getAllByProject.useQuery({
    projectId,
    limit: 10,
  }, {
    staleTime: 30000, // 30秒間キャッシュに延長
  });
  
  // デバッグ用
  const { data: debugData } = api.testSession.debugGetAll.useQuery({ projectId });
  if (debugData) {
    console.log("Debug data:", debugData);
  }
  const { data: bugTickets, isLoading: bugsLoading } = api.bugTicket.getAll.useQuery({
    projectId,
    limit: 10,
  }, {
    staleTime: 30000, // 30秒間キャッシュに延長
  });
  const { data: testConfigs, isLoading: configsLoading } = api.testConfig.getAllByProject.useQuery({
    projectId,
  }, {
    staleTime: 30000, // 設定は頻繁に変わらないので長めにキャッシュ
  });
  const { data: stats } = api.testSession.getStats.useQuery(
    { projectId },
    { staleTime: 30000 } // 30秒間キャッシュに延長
  );
  const { data: bugStats } = api.bugTicket.getStats.useQuery(
    { projectId },
    { staleTime: 30000 } // 30秒間キャッシュに延長
  );

  const startTest = api.testExecution.start.useMutation({
    onSuccess: (data) => {
      setIsStartTestModalOpen(false);
      router.push(`/projects/${projectId}/test-sessions/${data.sessionId}`);
    },
  });

  const handleStartTest = (testConfigId: string) => {
    startTest.mutate({ projectId, testConfigId });
  };

  const utils = api.useUtils();
  
  const deleteProject = api.project.delete.useMutation({
    onSuccess: async () => {
      toast("プロジェクトを削除しました", { type: "success" });
      await utils.project.getAll.invalidate();
      router.push("/projects");
    },
    onError: (error) => {
      toast(error.message || "プロジェクトの削除に失敗しました", { type: "error" });
    },
  });

  const handleDeleteProject = () => {
    deleteProject.mutate({ id: projectId });
  };

  const isLoading = projectLoading || sessionsLoading || bugsLoading || configsLoading;

  return (
    <Presentation
      project={project}
      testSessions={testSessions}
      bugTickets={bugTickets}
      testConfigs={testConfigs || []}
      stats={stats}
      bugStats={bugStats}
      isLoading={isLoading}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      isTestConfigModalOpen={isTestConfigModalOpen}
      setIsTestConfigModalOpen={setIsTestConfigModalOpen}
      isStartTestModalOpen={isStartTestModalOpen}
      setIsStartTestModalOpen={setIsStartTestModalOpen}
      onStartTest={handleStartTest}
      isStartingTest={startTest.isPending}
      isEditModalOpen={isEditModalOpen}
      setIsEditModalOpen={setIsEditModalOpen}
      showDeleteConfirm={showDeleteConfirm}
      setShowDeleteConfirm={setShowDeleteConfirm}
      onDeleteProject={handleDeleteProject}
      isDeletingProject={deleteProject.isPending}
    />
  );
};