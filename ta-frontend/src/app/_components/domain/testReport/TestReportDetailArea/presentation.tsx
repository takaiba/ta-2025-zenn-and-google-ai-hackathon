"use client";

import Link from "next/link";

import { LoadingSection } from "@/app/_components/common/LoadingSection";

import type { RouterOutputs } from "@/trpc/react";

type Props = {
  project: RouterOutputs["project"]["get"] | undefined;
  report: RouterOutputs["testReport"]["get"] | undefined;
  isLoading: boolean;
};

export const TestReportDetailAreaPresentation = ({
  project,
  report,
  isLoading,
}: Props) => {
  if (isLoading || !project || !report) {
    return <LoadingSection />;
  }

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
          <span className="mx-2 text-gray-400">/</span>
          <Link href={`/projects/${project.id}/test-sessions`} className="text-gray-500 hover:text-gray-700">
            テストセッション
          </Link>
          <span className="mx-2 text-gray-400">/</span>
          <Link href={`/projects/${project.id}/test-sessions/${report.testSessionId}`} className="text-gray-500 hover:text-gray-700">
            #{report.testSessionId.slice(-8)}
          </Link>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-gray-900">テストレポート</span>
        </nav>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              テストレポート
            </h1>
            <div className="mt-2 flex items-center gap-4">
              <span className="text-sm text-gray-500">
                生成日時: {new Date(report.createdAt).toLocaleString("ja-JP")}
              </span>
              {report.summary && typeof report.summary === 'object' && 'projectName' in report.summary && (
                <span className="text-sm text-gray-500">
                  プロジェクト: {String(report.summary.projectName)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Section */}
      {report.summary && typeof report.summary === 'object' && (
        <div className="mb-6 bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              レポートサマリー
            </h3>
          </div>
          <div className="border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6">
              {'totalTests' in report.summary && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <dt className="text-sm font-medium text-gray-500">
                    総テスト数
                  </dt>
                  <dd className="mt-1 text-lg font-medium text-gray-900">
                    {String(report.summary.totalTests)}
                  </dd>
                </div>
              )}
              {'passedTests' in report.summary && (
                <div className="bg-green-50 rounded-lg p-4">
                  <dt className="text-sm font-medium text-green-600">
                    成功テスト数
                  </dt>
                  <dd className="mt-1 text-lg font-medium text-green-800">
                    {String(report.summary.passedTests)}
                  </dd>
                </div>
              )}
              {'failedTests' in report.summary && (
                <div className="bg-red-50 rounded-lg p-4">
                  <dt className="text-sm font-medium text-red-600">
                    失敗テスト数
                  </dt>
                  <dd className="mt-1 text-lg font-medium text-red-800">
                    {String(report.summary.failedTests)}
                  </dd>
                </div>
              )}
              {'totalBugs' in report.summary && (
                <div className="bg-orange-50 rounded-lg p-4">
                  <dt className="text-sm font-medium text-orange-600">
                    検出バグ数
                  </dt>
                  <dd className="mt-1 text-lg font-medium text-orange-800">
                    {String(report.summary.totalBugs)}
                  </dd>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Report Content */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            レポート詳細
          </h3>
        </div>
        <div className="border-t border-gray-200">
          <div className="p-6">
            <div 
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: report.reportContent }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};