"use client";

import { api } from "@/trpc/react";

import { TestReportDetailAreaPresentation } from "./presentation";

type Props = {
  projectId: string;
  sessionId: string;
  reportId: string;
};

export const TestReportDetailArea = ({ projectId, sessionId, reportId }: Props) => {
  const { data: project } = api.project.get.useQuery({ id: projectId });
  const { data: report, isLoading } = api.testReport.get.useQuery({ id: reportId });

  return (
    <TestReportDetailAreaPresentation
      project={project}
      report={report}
      isLoading={isLoading}
    />
  );
};