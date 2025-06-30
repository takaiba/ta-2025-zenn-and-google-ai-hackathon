"use client";

import { api } from "@/trpc/react";

import { TestReportListAreaPresentation } from "./presentation";

type Props = {
  projectId: string;
  sessionId?: string;
};

export const TestReportListArea = ({ projectId, sessionId }: Props) => {
  const { data: project } = api.project.get.useQuery({ id: projectId });
  
  const { data: reportsData, isLoading } = api.testReport.getAll.useQuery({
    projectId,
    testSessionId: sessionId,
    limit: 50,
    offset: 0,
  });

  return (
    <TestReportListAreaPresentation
      project={project}
      reports={reportsData?.reports || []}
      total={reportsData?.total || 0}
      hasMore={reportsData?.hasMore || false}
      isLoading={isLoading}
      sessionId={sessionId}
    />
  );
};