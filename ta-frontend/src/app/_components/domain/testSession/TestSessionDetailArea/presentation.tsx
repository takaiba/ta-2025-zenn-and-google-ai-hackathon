"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/app/_components/common/Button";
import { ScreenshotThumbnail } from "@/app/_components/common/ImageModal";
import { LoadingSection } from "@/app/_components/common/LoadingSection";
import { KnowledgeIcon } from "@/app/_components/icon/KnowledgeIcon";
import { QuestionIcon } from "@/app/_components/icon/QuestionIcon";
import { SettingIcon } from "@/app/_components/icon/SettingIcon";
import { TimeIcon } from "@/app/_components/icon/TimeIcon";
import { useCurrentTime } from "@/hooks/useCurrentTime";
import { formatElapsedTime } from "@/utils/formatTime";


import type { RouterOutputs } from "@/trpc/react";

type Props = {
  project: RouterOutputs["project"]["get"] | undefined;
  session: RouterOutputs["testSession"]["get"] | undefined;
  testResults: RouterOutputs["testResult"]["getAllBySession"] | undefined;
  bugs: RouterOutputs["bugTicket"]["getAll"] | undefined;
  logs: RouterOutputs["testSession"]["getLogs"] | undefined;
  isLoading: boolean;
  activeTab: "overview" | "results" | "bugs" | "logs";
  setActiveTab: (tab: "overview" | "results" | "bugs" | "logs") => void;
  jobs?: RouterOutputs["jobQueue"]["getByTestSession"] | undefined;
  lastFetchTime?: Date;
  onGenerateReport: () => void;
  isGeneratingReport: boolean;
};

export const TestSessionDetailAreaPresentation = ({
  project,
  session,
  testResults,
  bugs,
  logs,
  isLoading,
  activeTab,
  setActiveTab,
  jobs,
  lastFetchTime,
  onGenerateReport,
  isGeneratingReport,
}: Props) => {
  const currentTime = useCurrentTime(1000); // 1秒ごとに更新
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  
  const toggleLogExpanded = (logId: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };
  
  if (isLoading || !project || !session) {
    return <LoadingSection />;
  }

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: "待機中", className: "bg-gray-100 text-gray-800" },
      running: { label: "実行中", className: "bg-blue-100 text-blue-800" },
      completed: { label: "完了", className: "bg-green-100 text-green-800" },
      failed: { label: "失敗", className: "bg-red-100 text-red-800" },
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

  const getDuration = () => {
    if (!session.completedAt) return "進行中";
    const start = new Date(session.startedAt || session.createdAt);
    const end = new Date(session.completedAt);
    const durationMs = end.getTime() - start.getTime();
    const minutes = Math.floor(durationMs / 60000);
    return `${minutes}分`;
  };

  const tabs = [
    { id: "overview", label: "概要", icon: KnowledgeIcon },
    { id: "results", label: "テスト結果", icon: KnowledgeIcon },
    { id: "bugs", label: "検出されたバグ", icon: QuestionIcon },
    { id: "logs", label: `ログ${logs ? ` (${logs.length})` : ""}`, icon: SettingIcon },
  ] as const;

  return (
    <div className={"p-6"}>
      {/* Header */}
      <div className={"mb-6"}>
        <nav className={"text-sm mb-2"}>
          <Link href={"/projects"} className={"text-gray-500 hover:text-gray-700"}>
            プロジェクト
          </Link>
          <span className={"mx-2 text-gray-400"}>/</span>
          <Link href={`/projects/${project.id}`} className={"text-gray-500 hover:text-gray-700"}>
            {project.name}
          </Link>
          <span className={"mx-2 text-gray-400"}>/</span>
          <Link href={`/projects/${project.id}/test-sessions`} className={"text-gray-500 hover:text-gray-700"}>
            テストセッション
          </Link>
          <span className={"mx-2 text-gray-400"}>/</span>
          <span className={"text-gray-900"}>#{session.id.slice(-8)}</span>
        </nav>
        <div className={"flex justify-between items-start"}>
          <div>
            <h1 className={"text-2xl font-bold text-gray-900"}>
              テストセッション #{session.id.slice(-8)}
            </h1>
            <div className={"mt-2 flex items-center gap-4"}>
              {getStatusBadge(session.status)}
              <span className={"text-sm text-gray-500"}>
                {session.testConfig.name}
              </span>
              <span className={"text-sm text-gray-500"}>
                実行時間: {getDuration()}
              </span>
              {(session.status === "pending" || session.status === "running") && (
                <span className={"flex items-center text-sm text-blue-600"}>
                  <span className={"animate-pulse mr-2"}>●</span>
                  自動更新中
                </span>
              )}
            </div>
          </div>
          {session.status === "completed" && (
            <Button
              variant={"outline"}
              onClick={onGenerateReport}
              disabled={isGeneratingReport}
            >
              {isGeneratingReport ? "レポート生成中..." : "レポート生成"}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className={"border-b border-gray-200 mb-6"}>
        <nav className={"-mb-px flex space-x-8"}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }
                `}
              >
                <Icon size={16} color={activeTab === tab.id ? "blue" : "grey"} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className={"space-y-6"}>
          {/* Summary Cards */}
          <div className={"grid grid-cols-1 md:grid-cols-4 gap-4"}>
            <div className={"bg-white overflow-hidden shadow rounded-lg"}>
              <div className={"p-5"}>
                <dl>
                  <dt className={"text-sm font-medium text-gray-500 truncate"}>
                    テスト済みページ
                  </dt>
                  <dd className={"mt-1 text-lg font-medium text-gray-900"}>
                    {session._count.testResults}
                  </dd>
                </dl>
              </div>
            </div>

            <div className={"bg-white overflow-hidden shadow rounded-lg"}>
              <div className={"p-5"}>
                <dl>
                  <dt className={"text-sm font-medium text-gray-500 truncate"}>
                    検出されたバグ
                  </dt>
                  <dd className={"mt-1 text-lg font-medium text-gray-900"}>
                    {session._count.bugTickets}
                  </dd>
                </dl>
              </div>
            </div>

            <div className={"bg-white overflow-hidden shadow rounded-lg"}>
              <div className={"p-5"}>
                <dl>
                  <dt className={"text-sm font-medium text-gray-500 truncate"}>
                    開始時刻
                  </dt>
                  <dd className={"mt-1 text-sm text-gray-900"}>
                    {new Date(session.createdAt).toLocaleString("ja-JP")}
                  </dd>
                </dl>
              </div>
            </div>

            <div className={"bg-white overflow-hidden shadow rounded-lg"}>
              <div className={"p-5"}>
                <dl>
                  <dt className={"text-sm font-medium text-gray-500 truncate"}>
                    終了時刻
                  </dt>
                  <dd className={"mt-1 text-sm text-gray-900"}>
                    {session.completedAt 
                      ? new Date(session.completedAt).toLocaleString("ja-JP")
                      : "-"
                    }
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          {/* Job Queue Status */}
          {jobs && jobs.length > 0 && (
            <div className={"bg-white shadow overflow-hidden sm:rounded-lg"}>
              <div className={"px-4 py-5 sm:px-6"}>
                <h3 className={"text-lg leading-6 font-medium text-gray-900"}>
                  ジョブキュー状態
                </h3>
              </div>
              <div className={"border-t border-gray-200"}>
                <ul className={"divide-y divide-gray-200"}>
                  {jobs.slice(0, 3).map((job) => (
                    <li key={job.id} className={"px-4 py-4"}>
                      <div className={"flex items-center justify-between"}>
                        <div className={"flex items-center gap-4 flex-1"}>
                          {job.screenshot && (
                            <ScreenshotThumbnail
                              src={job.screenshot}
                              alt={`Screenshot for job: ${job.type}`}
                              size="sm"
                            />
                          )}
                          <div>
                            <p className={"text-sm font-medium text-gray-900"}>
                              {job.type === "test_execution" ? "テスト実行" : job.type}
                            </p>
                            <p className={"text-sm text-gray-500"}>
                              優先度: {job.priority} | 試行回数: {job.attempts}/{job.maxAttempts}
                            </p>
                          </div>
                        </div>
                        <div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            job.status === "completed" ? "bg-green-100 text-green-800" :
                            job.status === "processing" ? "bg-blue-100 text-blue-800" :
                            job.status === "failed" ? "bg-red-100 text-red-800" :
                            "bg-gray-100 text-gray-800"
                          }`}>
                            {job.status === "completed" ? "完了" :
                             job.status === "processing" ? "処理中" :
                             job.status === "failed" ? "失敗" :
                             job.status === "pending" ? "待機中" :
                             job.status}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Session Details */}
          <div className={"bg-white shadow overflow-hidden sm:rounded-lg"}>
            <div className={"px-4 py-5 sm:px-6"}>
              <h3 className={"text-lg leading-6 font-medium text-gray-900"}>
                セッション詳細
              </h3>
            </div>
            <div className={"border-t border-gray-200 px-4 py-5 sm:p-0"}>
              <dl className={"sm:divide-y sm:divide-gray-200"}>
                <div className={"py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6"}>
                  <dt className={"text-sm font-medium text-gray-500"}>
                    セッションID
                  </dt>
                  <dd className={"mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2"}>
                    {session.id}
                  </dd>
                </div>
                <div className={"py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6"}>
                  <dt className={"text-sm font-medium text-gray-500"}>
                    テスト設定
                  </dt>
                  <dd className={"mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2"}>
                    {session.testConfig.name} ({session.testConfig.mode === "omakase" ? "おまかせ" : session.testConfig.mode === "scenario" ? "シナリオ" : "ハイブリッド"})
                  </dd>
                </div>
                <div className={"py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6"}>
                  <dt className={"text-sm font-medium text-gray-500"}>
                    ブラウザ
                  </dt>
                  <dd className={"mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2"}>
                    {session.testConfig.browser}
                  </dd>
                </div>
                <div className={"py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6"}>
                  <dt className={"text-sm font-medium text-gray-500"}>
                    最終更新
                  </dt>
                  <dd className={"mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2"}>
                    {new Date(session.updatedAt).toLocaleString("ja-JP")}
                    {(session.status === "pending" || session.status === "running") && lastFetchTime && (
                      <span className={"ml-2 text-xs text-gray-500"}>
                        (自動更新中 - {formatElapsedTime(Math.floor((currentTime.getTime() - lastFetchTime.getTime()) / 1000))})
                      </span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      )}

      {activeTab === "results" && (
        <div className={"space-y-6"}>
          <div className={"bg-white shadow overflow-hidden sm:rounded-md"}>
            {testResults && testResults.results.length > 0 ? (
              <ul className={"divide-y divide-gray-200"}>
                {testResults.results.map((result) => (
                  <li key={result.id}>
                    <div className={"px-4 py-4 sm:px-6"}>
                      <div className={"flex items-center justify-between"}>
                        <div className={"flex items-center gap-4 flex-1"}>
                          {result.screenshot && (
                            <ScreenshotThumbnail
                              src={result.screenshot}
                              alt={`Screenshot of ${result.url}`}
                              size="md"
                            />
                          )}
                          <div className={"flex-1"}>
                            <p className={"text-sm font-medium text-gray-900"}>
                              {result.url}
                            </p>
                            <div className={"mt-1 flex items-center gap-4 text-sm text-gray-500"}>
                              <span>
                                アクション実行: {Array.isArray(result.userActions) ? result.userActions.length : 0}
                              </span>
                              <span>
                                バグ検出: {result._count?.bugTickets || 0}
                              </span>
                              <span>
                                実行時間: {Math.round((result.executionTime || 0) / 1000)}秒
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className={"ml-2"}>
                          {getStatusBadge(result.status)}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={"px-4 py-8 text-center text-gray-500"}>
                テスト結果がありません
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "bugs" && (
        <div className={"space-y-6"}>
          <div className={"bg-white shadow overflow-hidden sm:rounded-md"}>
            {bugs && bugs.tickets.length > 0 ? (
              <ul className={"divide-y divide-gray-200"}>
                {bugs.tickets.map((bug) => (
                  <li key={bug.id}>
                    <Link href={`/projects/${project.id}/bugs/${bug.id}`}>
                      <div className={"px-4 py-4 hover:bg-gray-50 sm:px-6 cursor-pointer"}>
                        <div className={"flex items-center justify-between"}>
                          <div className={"flex items-center gap-4 flex-1 min-w-0"}>
                            {bug.screenshot && (
                              <div onClick={(e) => e.preventDefault()}>
                                <ScreenshotThumbnail
                                  src={bug.screenshot}
                                  alt={`Screenshot of bug: ${bug.title}`}
                                  size="md"
                                />
                              </div>
                            )}
                            <div className={"flex-1 min-w-0"}>
                              <p className={"text-sm font-medium text-gray-900 truncate"}>
                                {bug.title}
                              </p>
                              <div className={"mt-1 flex items-center gap-2"}>
                                {getSeverityBadge(bug.severity)}
                                <span className={"text-sm text-gray-500"}>
                                  {bug.bugType === "ui" && "UI"}
                                  {bug.bugType === "functional" && "機能"}
                                  {bug.bugType === "performance" && "パフォーマンス"}
                                  {bug.bugType === "security" && "セキュリティ"}
                                </span>
                                <span className={"text-sm text-gray-500"}>
                                  ページ: {bug.affectedUrl}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className={"ml-2 flex items-center text-sm text-gray-500"}>
                            <div className={"flex-shrink-0 mr-1.5"}>
                              <TimeIcon size={16} color={"grey"} />
                            </div>
                            {new Date(bug.createdAt).toLocaleString("ja-JP")}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={"px-4 py-8 text-center text-gray-500"}>
                バグが検出されていません
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "logs" && (
        <div className={"space-y-6"}>
          <div className={"bg-white shadow overflow-hidden sm:rounded-lg"}>
            <div className={"px-4 py-5 sm:px-6"}>
              <h3 className={"text-lg leading-6 font-medium text-gray-900"}>
                実行ログ
              </h3>
            </div>
            <div className={"border-t border-gray-200"}>
              {logs && logs.length > 0 ? (
                <div className={"divide-y divide-gray-200"}>
                  {logs.map((log) => {
                    const isExpanded = expandedLogs.has(log.id);
                    const hasDetails = log.metadata && Object.keys(log.metadata).length > 0;
                    
                    return (
                      <div key={log.id} className={"p-4"}>
                        <div className={"flex items-start gap-3"}>
                          <span className={`text-xs font-medium px-2 py-1 rounded ${
                            log.logLevel === "error" ? "bg-red-100 text-red-800" :
                            log.logLevel === "warning" ? "bg-yellow-100 text-yellow-800" :
                            "bg-gray-100 text-gray-800"
                          }`}>
                            {log.logLevel.toUpperCase()}
                          </span>
                          {log.screenshot && (
                            <ScreenshotThumbnail
                              src={log.screenshot}
                              alt={`Screenshot for log: ${log.message}`}
                              size="sm"
                            />
                          )}
                          <div className={"flex-1"}>
                            <div className={"flex items-start justify-between"}>
                              <div className={"flex-1"}>
                                <p className={"text-sm text-gray-900"}>{log.message}</p>
                                <p className={"text-xs text-gray-500 mt-1"}>
                                  {new Date(log.createdAt).toLocaleString("ja-JP")}
                                </p>
                              </div>
                              {hasDetails && (
                                <button
                                  onClick={() => toggleLogExpanded(log.id)}
                                  className={"ml-4 text-sm text-indigo-600 hover:text-indigo-500 focus:outline-none"}
                                >
                                  {isExpanded ? "詳細を隠す" : "詳細を表示"}
                                </button>
                              )}
                            </div>
                            {hasDetails && isExpanded && (
                              <div className={"mt-3 p-3 bg-gray-50 rounded-md"}>
                                <p className={"text-xs font-medium text-gray-700 mb-2"}>Details:</p>
                                <pre className={"text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap"}>
                                  {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className={"p-4 text-sm text-gray-500 text-center"}>
                  ログがありません
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};