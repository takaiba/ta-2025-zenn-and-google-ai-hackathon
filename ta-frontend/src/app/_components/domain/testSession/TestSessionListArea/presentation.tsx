"use client";

import Link from "next/link";

import { LoadingSection } from "@/app/_components/common/LoadingSection";
import { KnowledgeIcon } from "@/app/_components/icon/KnowledgeIcon";
import { QuestionIcon } from "@/app/_components/icon/QuestionIcon";
import { TimeIcon } from "@/app/_components/icon/TimeIcon";
import { useCurrentTime } from "@/hooks/useCurrentTime";
import { formatElapsedTime } from "@/utils/formatTime";


import type { RouterOutputs } from "@/trpc/react";

type Props = {
  project: RouterOutputs["project"]["get"] | undefined;
  sessions: RouterOutputs["testSession"]["getAllByProject"] | undefined;
  isLoading: boolean;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  jobStats?: Record<string, Record<string, number>> | undefined;
  onDeleteClick: (sessionId: string, e: React.MouseEvent) => void;
  deletingSessionId: string | null;
  showDeleteConfirm: boolean;
  sessionToDelete: string | null;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
};

export const TestSessionListAreaPresentation = ({
  project,
  sessions,
  isLoading,
  statusFilter,
  onStatusFilterChange,
  onDeleteClick,
  deletingSessionId,
  showDeleteConfirm,
  sessionToDelete,
  onConfirmDelete,
  onCancelDelete,
}: Props) => {
  const currentTime = useCurrentTime(1000); // 1秒ごとに更新
  
  if (isLoading || !project) {
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

  const getDuration = (session: NonNullable<Props["sessions"]>["sessions"][number]) => {
    if (!session.completedAt) return "-";
    const start = new Date(session.startedAt || session.createdAt);
    const end = new Date(session.completedAt);
    const durationMs = end.getTime() - start.getTime();
    const minutes = Math.floor(durationMs / 60000);
    return `${minutes}分`;
  };

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
          <span className={"text-gray-900"}>テストセッション</span>
        </nav>
        <h1 className={"text-2xl font-bold text-gray-900"}>テストセッション</h1>
        <p className={"mt-1 text-sm text-gray-500"}>
          {project.name}のテスト実行履歴
        </p>
      </div>

      {/* Filters */}
      <div className={"bg-white p-4 rounded-lg shadow mb-6"}>
        <div className={"flex items-center gap-4"}>
          <label className={"text-sm font-medium text-gray-700"}>
            ステータス:
          </label>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className={"block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"}
          >
            <option value={"all"}>すべて</option>
            <option value={"pending"}>待機中</option>
            <option value={"running"}>実行中</option>
            <option value={"completed"}>完了</option>
            <option value={"failed"}>失敗</option>
          </select>
        </div>
      </div>

      {/* Session List */}
      <div className={"bg-white shadow overflow-hidden sm:rounded-md"}>
        {sessions && sessions.sessions.length > 0 ? (
          <ul className={"divide-y divide-gray-200"}>
            {sessions.sessions.map((session) => (
              <li key={session.id}>
                <div className={"relative"}>
                  <Link href={`/projects/${project.id}/test-sessions/${session.id}`}>
                    <div className={"px-4 py-4 hover:bg-gray-50 sm:px-6 cursor-pointer"}>
                      <div className={"flex items-center justify-between"}>
                        <div className={"flex-1"}>
                          <div className={"flex items-center"}>
                            <p className={"text-sm font-medium text-indigo-600 truncate"}>
                              セッション #{session.id.slice(-8)}
                            </p>
                            <div className={"ml-2"}>
                              {getStatusBadge(session.status)}
                            </div>
                          </div>
                          <div className={"mt-2 flex items-center gap-4 text-sm text-gray-500"}>
                            <span className={"flex items-center"}>
                              <KnowledgeIcon size={16} color={"grey"} />
                              <span className={"ml-1"}>{session.testConfig.name}</span>
                            </span>
                            <span className={"flex items-center"}>
                              <TimeIcon size={16} color={"grey"} />
                              <span className={"ml-1"}>実行時間: {getDuration(session)}</span>
                            </span>
                            <span className={"flex items-center"}>
                              <QuestionIcon size={16} color={"grey"} />
                              <span className={"ml-1"}>{session._count.bugTickets} バグ発見</span>
                            </span>
                            <span>
                              {session._count.testResults} ページテスト済み
                            </span>
                          </div>
                        </div>
                        <div className={"ml-2 flex items-start gap-3"}>
                          <div className={"flex flex-col items-end"}>
                            <div className={"flex items-center text-sm text-gray-500"}>
                              <div className={"flex-shrink-0 mr-1.5"}>
                                <TimeIcon size={16} color={"grey"} />
                              </div>
                              {new Date(session.createdAt).toLocaleString("ja-JP")}
                            </div>
                            {(session.status === "pending" || session.status === "running") && (
                              <div className={"text-xs text-gray-400 mt-1"}>
                                最終更新: {formatElapsedTime(Math.floor((currentTime.getTime() - new Date(session.updatedAt).getTime()) / 1000))}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={(e) => onDeleteClick(session.id, e)}
                            disabled={deletingSessionId === session.id}
                            className={"p-2 text-gray-400 hover:text-red-600 transition-colors duration-200 disabled:opacity-50"}
                            title="削除"
                          >
                            {deletingSessionId === session.id ? (
                              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className={"px-4 py-8 text-center text-gray-500"}>
            テストセッションがありません
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              テストセッションの削除
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              このテストセッションを削除してもよろしいですか？
              <br />
              関連するバグチケット、テスト結果、レポートもすべて削除されます。
              <br />
              <strong className="text-red-600">この操作は取り消せません。</strong>
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={onCancelDelete}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                キャンセル
              </button>
              <button
                onClick={onConfirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};