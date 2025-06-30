"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { api } from "@/trpc/react";

import { GlobalTestReportListAreaPresentation } from "./presentation";

export default function ReportsPage() {
  const searchParams = useSearchParams();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    searchParams.get("projectId")
  );

  const { data: projects } = api.project.getAll.useQuery();

  const { data: reportsData, isLoading } = api.testReport.getAll.useQuery({
    projectId: selectedProjectId || undefined,
    limit: 50,
    offset: 0,
  });

  return (
    <GlobalTestReportListAreaPresentation
      projects={projects || []}
      reports={reportsData?.reports || []}
      total={reportsData?.total || 0}
      hasMore={reportsData?.hasMore || false}
      isLoading={isLoading}
      selectedProjectId={selectedProjectId}
      onProjectChange={setSelectedProjectId}
    />
  );
}