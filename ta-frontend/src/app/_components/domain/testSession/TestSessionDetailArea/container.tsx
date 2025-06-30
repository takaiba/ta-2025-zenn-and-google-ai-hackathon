"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { api } from "@/trpc/react";
import { useTestSessionPolling } from "@/hooks/useTestSessionPolling";

import { TestSessionDetailAreaPresentation } from "./presentation";

type Props = {
  projectId: string;
  sessionId: string;
};

export const TestSessionDetailArea = ({ projectId, sessionId }: Props) => {
  const [activeTab, setActiveTab] = useState<"overview" | "results" | "bugs" | "logs">("overview");
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const router = useRouter();
  
  const { data: project } = api.project.get.useQuery({ id: projectId });
  
  // ポーリング機能を使用してテストセッションの状態を監視
  const { session, jobs, isRunning, isPending, lastFetchTime } = useTestSessionPolling(sessionId, {
    enabled: true,
    interval: 3000 // 3秒ごとに更新
  });
  
  // ポーリングが必要な場合はrefetchIntervalを設定
  const shouldPoll = isRunning || isPending;

  // レポート生成のmutation
  const generateReportMutation = api.testReport.generate.useMutation({
    onSuccess: (report) => {
      setIsGeneratingReport(false);
      toast.success("レポートが生成されました");
      // レポート画面に自動遷移
      router.push(`/projects/${projectId}/test-sessions/${sessionId}/reports/${report.id}`);
    },
    onError: (error) => {
      setIsGeneratingReport(false);
      toast.error(error.message || "レポートの生成に失敗しました");
    }
  });

  const handleGenerateReport = () => {
    if (!sessionId) return;
    setIsGeneratingReport(true);
    generateReportMutation.mutate({ testSessionId: sessionId });
  };
  
  const { data: testResults } = api.testResult.getAllBySession.useQuery(
    { sessionId },
    { refetchInterval: shouldPoll ? 3000 : false }
  );
  
  // TODO: Add testSessionId filter to bugTicket.getAll or create a separate query
  const { data: bugs } = api.bugTicket.getAll.useQuery(
    { projectId },
    { refetchInterval: shouldPoll ? 3000 : false }
  );
  
  const { data: logs } = api.testSession.getLogs.useQuery(
    { sessionId },
    { refetchInterval: shouldPoll ? 3000 : false }
  );

  return (
    <TestSessionDetailAreaPresentation
      project={project}
      session={session}
      testResults={testResults}
      bugs={bugs}
      logs={logs}
      isLoading={!session}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      jobs={jobs}
      lastFetchTime={lastFetchTime}
      onGenerateReport={handleGenerateReport}
      isGeneratingReport={isGeneratingReport}
    />
  );
};