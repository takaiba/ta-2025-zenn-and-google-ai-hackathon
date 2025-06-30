"use client";

import Link from "next/link";

import { Button } from "@/app/_components/common/Button";
import { LoadingSection } from "@/app/_components/common/LoadingSection";
import { UserIcon } from "@/app/_components/icon/UserIcon";


import type { RouterOutputs } from "@/trpc/react";

type Props = {
  project: RouterOutputs["project"]["get"] | undefined;
  bug: RouterOutputs["bugTicket"]["get"] | undefined;
  comments: RouterOutputs["bugTicket"]["getComments"] | undefined;
  isLoading: boolean;
  commentText: string;
  setCommentText: (text: string) => void;
  isSubmittingComment: boolean;
  isUpdatingStatus: boolean;
  onStatusChange: (status: string) => void;
  onAddComment: () => void;
};

export const BugDetailAreaPresentation = ({
  project,
  bug,
  comments,
  isLoading,
  commentText,
  setCommentText,
  isSubmittingComment,
  isUpdatingStatus,
  onStatusChange,
  onAddComment,
}: Props) => {
  if (isLoading || !project || !bug) {
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

  const getBugTypeBadge = (type: string) => {
    const typeMap = {
      ui: { label: "UI", className: "bg-blue-100 text-blue-800" },
      functional: { label: "機能", className: "bg-purple-100 text-purple-800" },
      performance: { label: "パフォーマンス", className: "bg-green-100 text-green-800" },
      security: { label: "セキュリティ", className: "bg-red-100 text-red-800" },
    };

    const typeInfo = typeMap[type as keyof typeof typeMap] || { 
      label: type, 
      className: "bg-gray-100 text-gray-800" 
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeInfo.className}`}>
        {typeInfo.label}
      </span>
    );
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
          <Link href={`/projects/${project.id}?activeTab=bugs`} className={"text-gray-500 hover:text-gray-700"}>
            バグ
          </Link>
          <span className={"mx-2 text-gray-400"}>/</span>
          <span className={"text-gray-900"}>#{bug.id.slice(-8)}</span>
        </nav>
        <div className={"flex justify-between items-start"}>
          <div>
            <h1 className={"text-2xl font-bold text-gray-900"}>
              {bug.title}
            </h1>
            <div className={"mt-2 flex items-center gap-4"}>
              {getStatusBadge(bug.status)}
              {getSeverityBadge(bug.severity)}
              {getBugTypeBadge(bug.bugType)}
              <span className={"text-sm text-gray-500"}>
                作成日: {new Date(bug.createdAt).toLocaleDateString("ja-JP")}
              </span>
            </div>
          </div>
          <div className={"flex items-center gap-2"}>
            <select
              value={bug.status}
              onChange={(e) => onStatusChange(e.target.value)}
              disabled={isUpdatingStatus}
              className={"block w-32 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"}
            >
              <option value={"open"}>未対応</option>
              <option value={"in_progress"}>対応中</option>
              <option value={"resolved"}>解決済み</option>
              <option value={"closed"}>クローズ</option>
            </select>
          </div>
        </div>
      </div>

      <div className={"grid grid-cols-1 lg:grid-cols-3 gap-6"}>
        {/* Main Content */}
        <div className={"lg:col-span-2 space-y-6"}>
          {/* Bug Details */}
          <div className={"bg-white shadow overflow-hidden sm:rounded-lg"}>
            <div className={"px-4 py-5 sm:px-6"}>
              <h3 className={"text-lg leading-6 font-medium text-gray-900"}>
                バグ詳細
              </h3>
            </div>
            <div className={"border-t border-gray-200 px-4 py-5 sm:p-6"}>
              <p className={"text-sm text-gray-900 whitespace-pre-wrap"}>
                {bug.description}
              </p>
            </div>
          </div>

          {/* Reproduction Steps */}
          {bug.reproductionSteps && (
            <div className={"bg-white shadow overflow-hidden sm:rounded-lg"}>
              <div className={"px-4 py-5 sm:px-6"}>
                <h3 className={"text-lg leading-6 font-medium text-gray-900"}>
                  再現手順
                </h3>
              </div>
              <div className={"border-t border-gray-200 px-4 py-5 sm:p-6"}>
                <pre className={"text-sm text-gray-900 whitespace-pre-wrap"}>
                  {typeof bug.reproductionSteps === 'string' 
                    ? bug.reproductionSteps 
                    : JSON.stringify(bug.reproductionSteps, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Screenshot */}
          {bug.screenshot && (
            <div className={"bg-white shadow overflow-hidden sm:rounded-lg"}>
              <div className={"px-4 py-5 sm:px-6"}>
                <h3 className={"text-lg leading-6 font-medium text-gray-900"}>
                  スクリーンショット
                </h3>
              </div>
              <div className={"border-t border-gray-200 px-4 py-5 sm:p-6"}>
                <img
                  src={bug.screenshot}
                  alt={"スクリーンショット"}
                  className={"rounded-lg border border-gray-200 max-w-full"}
                />
              </div>
            </div>
          )}

          {/* Comments */}
          <div className={"bg-white shadow overflow-hidden sm:rounded-lg"}>
            <div className={"px-4 py-5 sm:px-6"}>
              <h3 className={"text-lg leading-6 font-medium text-gray-900"}>
                コメント
              </h3>
            </div>
            <div className={"border-t border-gray-200"}>
              {comments && comments.comments.length > 0 ? (
                <ul className={"divide-y divide-gray-200"}>
                  {comments.comments.map((comment) => (
                    <li key={comment.id} className={"px-4 py-4 sm:px-6"}>
                      <div className={"flex items-start"}>
                        <div className={"flex-shrink-0"}>
                          <UserIcon size={32} color={"grey"} />
                        </div>
                        <div className={"ml-3 flex-1"}>
                          <div className={"flex items-center justify-between"}>
                            <p className={"text-sm font-medium text-gray-900"}>
                              {comment.authorName || "匿名"}
                            </p>
                            <p className={"text-sm text-gray-500"}>
                              {new Date(comment.createdAt).toLocaleString("ja-JP")}
                            </p>
                          </div>
                          <p className={"mt-1 text-sm text-gray-700 whitespace-pre-wrap"}>
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className={"px-4 py-5 sm:px-6 text-center text-gray-500"}>
                  コメントはまだありません
                </div>
              )}

              {/* Add Comment */}
              <div className={"px-4 py-4 sm:px-6 border-t border-gray-200"}>
                <div className={"flex gap-3"}>
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={"コメントを入力..."}
                    rows={3}
                    className={"flex-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"}
                  />
                  <Button
                    onClick={onAddComment}
                    disabled={isSubmittingComment || !commentText.trim()}
                  >
                    送信
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className={"space-y-6"}>
          {/* Bug Info */}
          <div className={"bg-white shadow overflow-hidden sm:rounded-lg"}>
            <div className={"px-4 py-5 sm:px-6"}>
              <h3 className={"text-lg leading-6 font-medium text-gray-900"}>
                バグ情報
              </h3>
            </div>
            <div className={"border-t border-gray-200"}>
              <dl>
                <div className={"px-4 py-4 sm:px-6"}>
                  <dt className={"text-sm font-medium text-gray-500"}>ID</dt>
                  <dd className={"mt-1 text-sm text-gray-900"}>
                    {bug.id.slice(-8)}
                  </dd>
                </div>
                <div className={"px-4 py-4 sm:px-6"}>
                  <dt className={"text-sm font-medium text-gray-500"}>検出ページ</dt>
                  <dd className={"mt-1 text-sm text-gray-900"}>
                    <a
                      href={bug.affectedUrl}
                      target={"_blank"}
                      rel={"noopener noreferrer"}
                      className={"text-indigo-600 hover:text-indigo-500"}
                    >
                      {bug.affectedUrl}
                    </a>
                  </dd>
                </div>
                {bug.testSession && (
                  <div className={"px-4 py-4 sm:px-6"}>
                    <dt className={"text-sm font-medium text-gray-500"}>テストセッション</dt>
                    <dd className={"mt-1 text-sm text-gray-900"}>
                      <Link
                        href={`/projects/${project.id}/test-sessions/${bug.testSession.id}`}
                        className={"text-indigo-600 hover:text-indigo-500"}
                      >
                        #{bug.testSession.id.slice(-8)}
                      </Link>
                    </dd>
                  </div>
                )}
                <div className={"px-4 py-4 sm:px-6"}>
                  <dt className={"text-sm font-medium text-gray-500"}>影響コンポーネント</dt>
                  <dd className={"mt-1 text-sm text-gray-900 font-mono text-xs"}>
                    {bug.affectedComponents?.join(", ") || "-"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* AI Confidence */}
          {bug.aiConfidenceScore !== null && (
            <div className={"bg-white shadow overflow-hidden sm:rounded-lg"}>
              <div className={"px-4 py-5 sm:px-6"}>
                <h3 className={"text-lg leading-6 font-medium text-gray-900"}>
                  AI信頼度
                </h3>
              </div>
              <div className={"border-t border-gray-200 px-4 py-5 sm:p-6"}>
                <div className={"flex items-center"}>
                  <div className={"flex-1 bg-gray-200 rounded-full h-2"}>
                    <div
                      className={"bg-indigo-600 h-2 rounded-full"}
                      style={{ width: `${bug.aiConfidenceScore * 100}%` }}
                    />
                  </div>
                  <span className={"ml-3 text-sm font-medium text-gray-900"}>
                    {Math.round(bug.aiConfidenceScore * 100)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};