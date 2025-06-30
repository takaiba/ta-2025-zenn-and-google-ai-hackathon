"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { LoadingSection } from "@/app/_components/common/LoadingSection";
import { TimeIcon } from "@/app/_components/icon/TimeIcon";

import type { RouterOutputs } from "@/trpc/react";

type Props = {
  projects: RouterOutputs["project"]["getAll"];
  reports: RouterOutputs["testReport"]["getAll"]["reports"];
  total: number;
  hasMore: boolean;
  isLoading: boolean;
  selectedProjectId: string | null;
  onProjectChange: (projectId: string | null) => void;
};

export const GlobalTestReportListAreaPresentation = ({
  projects,
  reports,
  total,
  hasMore,
  isLoading,
  selectedProjectId,
  onProjectChange,
}: Props) => {
  const router = useRouter();

  if (isLoading) {
    return <LoadingSection />;
  }

  const updateFilter = (projectId: string) => {
    const params = new URLSearchParams(window.location.search);
    if (projectId === "all") {
      params.delete("projectId");
      onProjectChange(null);
    } else {
      params.set("projectId", projectId);
      onProjectChange(projectId);
    }
    router.push(`/reports?${params.toString()}`);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">テストレポート</h1>
        <p className="mt-1 text-sm text-gray-500">
          全プロジェクトのテストレポートを確認・管理できます
        </p>
      </div>

      {/* Filter */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">
            プロジェクト:
          </label>
          <select
            value={selectedProjectId || "all"}
            onChange={(e) => updateFilter(e.target.value)}
            className="block w-64 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="all">すべて</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Reports List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {reports.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {reports.map((report) => {
              const project = projects.find(p => p.id === report.testSession?.projectId);
              return (
                <li key={report.id}>
                  <Link href={`/projects/${report.testSession?.projectId}/test-sessions/${report.testSessionId}/reports/${report.id}`}>
                    <div className="px-4 py-4 hover:bg-gray-50 sm:px-6 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-gray-900">
                                  {project?.name || "不明なプロジェクト"}
                                </p>
                                <span className="mx-2 text-gray-400">/</span>
                                <p className="text-sm text-gray-600">
                                  テストレポート
                                </p>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {report.language === 'ja' ? '日本語' : '英語'}
                                </span>
                              </div>
                              <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                                <span>
                                  テストセッション: #{report.testSessionId.slice(-8)}
                                </span>
                                {report.summary && typeof report.summary === 'object' && 'totalTests' in report.summary && (
                                  <span>
                                    テスト数: {String(report.summary.totalTests)}
                                  </span>
                                )}
                                {report.summary && typeof report.summary === 'object' && 'totalBugs' in report.summary && (
                                  <span>
                                    バグ数: {String(report.summary.totalBugs)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="ml-2 flex items-center text-sm text-gray-500">
                          <div className="flex-shrink-0 mr-1.5">
                            <TimeIcon size={16} color="grey" />
                          </div>
                          {new Date(report.createdAt).toLocaleString("ja-JP")}
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="px-4 py-8 text-center text-gray-500">
            {selectedProjectId 
              ? "選択されたプロジェクトのレポートがありません" 
              : "レポートがありません"
            }
          </div>
        )}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="mt-4 text-center">
          <button
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            onClick={() => {
              // TODO: Implement load more functionality
              console.log("Load more reports");
            }}
          >
            さらに読み込む
          </button>
        </div>
      )}
    </div>
  );
};