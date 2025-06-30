"use client";

import { useSearchParams } from "next/navigation";

import { api } from "@/trpc/react";

import { BugListAreaPresentation } from "./presentation";

type Props = {
  projectId?: string;
};

export const BugListArea = ({ projectId: propProjectId }: Props = {}) => {
  const searchParams = useSearchParams();
  const projectId = propProjectId || searchParams.get("projectId");
  const status = searchParams.get("status") || "all";
  const severity = searchParams.get("severity") || "all";
  const type = searchParams.get("type") || "all";

  const { data: bugs, isLoading } = api.bugTicket.getAll.useQuery({
    projectId: projectId || undefined,
    status: status === "all" ? undefined : [status as "open" | "in_progress" | "resolved" | "closed" | "false_positive"],
    severity: severity === "all" ? undefined : [severity as "critical" | "high" | "medium" | "low"],
    bugType: type === "all" ? undefined : [type as "ui" | "functional" | "performance" | "security"],
  }, {
    staleTime: 30000, // 30秒間キャッシュ
  });

  const { data: projects } = api.project.getAll.useQuery(undefined, {
    staleTime: 60000, // プロジェクト一覧は1分間キャッシュ
  });
  
  const { data: stats } = api.bugTicket.getStats.useQuery({
    projectId: projectId || undefined,
  }, {
    staleTime: 30000, // 30秒間キャッシュ
  });

  return (
    <BugListAreaPresentation
      bugs={bugs}
      projects={projects || []}
      stats={stats}
      isLoading={isLoading}
      filters={{
        projectId: projectId || "all",
        status,
        severity,
        type,
      }}
    />
  );
};