"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { LoadingSection } from "@/app/_components/common/LoadingSection";
import { QuestionIcon } from "@/app/_components/icon/QuestionIcon";
import { TimeIcon } from "@/app/_components/icon/TimeIcon";

import type { RouterOutputs } from "@/trpc/react";

type Props = {
  bugs: RouterOutputs["bugTicket"]["getAll"] | undefined;
  projects: RouterOutputs["project"]["getAll"];
  stats: RouterOutputs["bugTicket"]["getStats"] | undefined;
  isLoading: boolean;
  filters: {
    projectId: string;
    status: string;
    severity: string;
    type: string;
  };
};

export const BugListAreaPresentation = ({
  bugs,
  projects,
  stats,
  isLoading,
  filters,
}: Props) => {
  const router = useRouter();

  if (isLoading) {
    return <LoadingSection />;
  }

  const getStatusBadge = (status: string) => {
    const statusMap = {
      open: { label: "未対応", className: "bg-red-100 text-red-800" },
      in_progress: { label: "対応中", className: "bg-yellow-100 text-yellow-800" },
      resolved: { label: "解決済み", className: "bg-green-100 text-green-800" },
      closed: { label: "クローズ", className: "bg-gray-100 text-gray-800" },
    };

    const statusInfo = statusMap[status as keyof typeof statusMap] || { 
      label: status, 
      className: "bg-gray-100 text-gray-800" 
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    );
  };

  const getSeverityBadge = (severity: string) => {
    const severityMap = {
      critical: { label: "緊急", className: "bg-red-100 text-red-800" },
      high: { label: "高", className: "bg-orange-100 text-orange-800" },
      medium: { label: "中", className: "bg-yellow-100 text-yellow-800" },
      low: { label: "低", className: "bg-gray-100 text-gray-800" },
    };

    const severityInfo = severityMap[severity as keyof typeof severityMap] || { 
      label: severity, 
      className: "bg-gray-100 text-gray-800" 
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${severityInfo.className}`}>
        {severityInfo.label}
      </span>
    );
  };

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(window.location.search);
    if (value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`/bugs?${params.toString()}`);
  };

  return (
    <div className={"p-6"}>
      {/* Header */}
      <div className={"mb-6"}>
        <h1 className={"text-2xl font-bold text-gray-900"}>バグチケット</h1>
        <p className={"mt-1 text-sm text-gray-500"}>
          すべてのプロジェクトで検出されたバグを一覧で確認できます
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className={"grid grid-cols-1 md:grid-cols-4 gap-4 mb-6"}>
          <div className={"bg-white overflow-hidden shadow rounded-lg"}>
            <div className={"p-5"}>
              <div className={"flex items-center"}>
                <div className={"flex-shrink-0"}>
                  <QuestionIcon size={24} color={"red"} />
                </div>
                <div className={"ml-5 w-0 flex-1"}>
                  <dl>
                    <dt className={"text-sm font-medium text-gray-500 truncate"}>
                      未対応
                    </dt>
                    <dd className={"text-lg font-medium text-gray-900"}>
                      {stats.byStatus?.open || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className={"bg-white overflow-hidden shadow rounded-lg"}>
            <div className={"p-5"}>
              <div className={"flex items-center"}>
                <div className={"flex-shrink-0"}>
                  <QuestionIcon size={24} color={"yellow"} />
                </div>
                <div className={"ml-5 w-0 flex-1"}>
                  <dl>
                    <dt className={"text-sm font-medium text-gray-500 truncate"}>
                      対応中
                    </dt>
                    <dd className={"text-lg font-medium text-gray-900"}>
                      {stats.byStatus?.in_progress || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className={"bg-white overflow-hidden shadow rounded-lg"}>
            <div className={"p-5"}>
              <div className={"flex items-center"}>
                <div className={"flex-shrink-0"}>
                  <QuestionIcon size={24} color={"grey"} />
                </div>
                <div className={"ml-5 w-0 flex-1"}>
                  <dl>
                    <dt className={"text-sm font-medium text-gray-500 truncate"}>
                      解決済み
                    </dt>
                    <dd className={"text-lg font-medium text-gray-900"}>
                      {stats.byStatus?.resolved || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className={"bg-white overflow-hidden shadow rounded-lg"}>
            <div className={"p-5"}>
              <div className={"flex items-center"}>
                <div className={"flex-shrink-0"}>
                  <QuestionIcon size={24} color={"red"} />
                </div>
                <div className={"ml-5 w-0 flex-1"}>
                  <dl>
                    <dt className={"text-sm font-medium text-gray-500 truncate"}>
                      緊急度: 高
                    </dt>
                    <dd className={"text-lg font-medium text-gray-900"}>
                      {stats.bySeverity?.critical || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className={"bg-white p-4 rounded-lg shadow mb-6"}>
        <div className={"grid grid-cols-1 md:grid-cols-4 gap-4"}>
          <div>
            <label className={"block text-sm font-medium text-gray-700 mb-1"}>
              プロジェクト
            </label>
            <select
              value={filters.projectId}
              onChange={(e) => updateFilter("projectId", e.target.value)}
              className={"block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"}
            >
              <option value={"all"}>すべて</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={"block text-sm font-medium text-gray-700 mb-1"}>
              ステータス
            </label>
            <select
              value={filters.status}
              onChange={(e) => updateFilter("status", e.target.value)}
              className={"block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"}
            >
              <option value={"all"}>すべて</option>
              <option value={"open"}>未対応</option>
              <option value={"in_progress"}>対応中</option>
              <option value={"resolved"}>解決済み</option>
              <option value={"closed"}>クローズ</option>
            </select>
          </div>

          <div>
            <label className={"block text-sm font-medium text-gray-700 mb-1"}>
              緊急度
            </label>
            <select
              value={filters.severity}
              onChange={(e) => updateFilter("severity", e.target.value)}
              className={"block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"}
            >
              <option value={"all"}>すべて</option>
              <option value={"critical"}>緊急</option>
              <option value={"high"}>高</option>
              <option value={"medium"}>中</option>
              <option value={"low"}>低</option>
            </select>
          </div>

          <div>
            <label className={"block text-sm font-medium text-gray-700 mb-1"}>
              種類
            </label>
            <select
              value={filters.type}
              onChange={(e) => updateFilter("type", e.target.value)}
              className={"block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"}
            >
              <option value={"all"}>すべて</option>
              <option value={"ui"}>UI</option>
              <option value={"functional"}>機能</option>
              <option value={"performance"}>パフォーマンス</option>
              <option value={"security"}>セキュリティ</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bug List */}
      <div className={"bg-white shadow overflow-hidden sm:rounded-md"}>
        {bugs && bugs.tickets.length > 0 ? (
          <ul className={"divide-y divide-gray-200"}>
            {bugs.tickets.map((bug) => {
              const project = projects.find(p => p.id === bug.projectId);
              return (
                <li key={bug.id}>
                  <Link href={`/projects/${bug.projectId}/bugs/${bug.id}`}>
                    <div className={"px-4 py-4 hover:bg-gray-50 sm:px-6 cursor-pointer"}>
                      <div className={"flex items-center justify-between"}>
                        <div className={"flex-1 min-w-0"}>
                          <div className={"flex items-center"}>
                            <p className={"text-sm font-medium text-indigo-600 truncate"}>
                              {project?.name}
                            </p>
                            <span className={"mx-2 text-gray-400"}>/</span>
                            <p className={"text-sm font-medium text-gray-900 truncate flex-1"}>
                              {bug.title}
                            </p>
                          </div>
                          <div className={"mt-2 flex items-center gap-2"}>
                            {getStatusBadge(bug.status)}
                            {getSeverityBadge(bug.severity)}
                            <span className={"text-sm text-gray-500"}>
                              {bug.bugType === "ui" && "UI"}
                              {bug.bugType === "functional" && "機能"}
                              {bug.bugType === "performance" && "パフォーマンス"}
                              {bug.bugType === "security" && "セキュリティ"}
                            </span>
                            <span className={"text-sm text-gray-500"}>
                              • {bug._count.comments} コメント
                            </span>
                          </div>
                        </div>
                        <div className={"ml-2 flex items-center text-sm text-gray-500"}>
                          <div className={"flex-shrink-0 mr-1.5"}>
                            <TimeIcon size={16} color={"grey"} />
                          </div>
                          {new Date(bug.createdAt).toLocaleDateString("ja-JP")}
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className={"px-4 py-8 text-center text-gray-500"}>
            バグが検出されていません
          </div>
        )}
      </div>
    </div>
  );
};