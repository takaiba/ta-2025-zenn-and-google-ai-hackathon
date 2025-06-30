"use client";

import Link from "next/link";

import { LoadingSection } from "@/app/_components/common/LoadingSection";
import { TimeIcon } from "@/app/_components/icon/TimeIcon";

import type { RouterOutputs } from "@/trpc/react";

type Props = {
  project: RouterOutputs["project"]["get"] | undefined;
  reports: RouterOutputs["testReport"]["getAll"]["reports"];
  total: number;
  hasMore: boolean;
  isLoading: boolean;
  sessionId?: string;
};

export const TestReportListAreaPresentation = ({
  project,
  reports,
  total,
  hasMore,
  isLoading,
  sessionId,
}: Props) => {
  if (isLoading || !project) {
    return <LoadingSection />;
  }

  const basePath = sessionId 
    ? `/projects/${project.id}/test-sessions/${sessionId}`
    : `/projects/${project.id}`;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <nav className="text-sm mb-2">
          <Link href="/projects" className="text-gray-500 hover:text-gray-700">
            プロジェクト
          </Link>
          <span className="mx-2 text-gray-400">/</span>
          <Link href={`/projects/${project.id}`} className="text-gray-500 hover:text-gray-700">
            {project.name}
          </Link>
          {sessionId && (
            <>
              <span className="mx-2 text-gray-400">/</span>
              <Link href={`/projects/${project.id}/test-sessions`} className="text-gray-500 hover:text-gray-700">
                テストセッション
              </Link>
              <span className="mx-2 text-gray-400">/</span>
              <Link href={`/projects/${project.id}/test-sessions/${sessionId}`} className="text-gray-500 hover:text-gray-700">
                #{sessionId.slice(-8)}
              </Link>
            </>
          )}
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-gray-900">テストレポート一覧</span>
        </nav>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {sessionId ? "テストセッションのレポート" : "テストレポート一覧"}
            </h1>
            <div className="mt-2 text-sm text-gray-500">
              {total > 0 ? `${total}件のレポートが見つかりました` : "レポートがありません"}
            </div>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {reports.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {reports.map((report) => (
              <li key={report.id}>
                <Link href={`${basePath}/reports/${report.id}`}>
                  <div className="px-4 py-4 hover:bg-gray-50 sm:px-6 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-900">
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
            ))}
          </ul>
        ) : (
          <div className="px-4 py-8 text-center text-gray-500">
            {sessionId 
              ? "このテストセッションのレポートがありません" 
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