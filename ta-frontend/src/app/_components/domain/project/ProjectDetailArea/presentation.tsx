"use client";

import Link from "next/link";

import { Button } from "@/app/_components/common/Button";
import { Modal, ConfirmDialog } from "@/app/_components/common/Dialog";
import { LoadingSection } from "@/app/_components/common/LoadingSection";
import { EditProjectModal } from "@/app/_components/domain/project/EditProjectModal";
import { AddIcon } from "@/app/_components/icon/AddIcon";
import { KnowledgeIcon } from "@/app/_components/icon/KnowledgeIcon";
import { QuestionIcon } from "@/app/_components/icon/QuestionIcon";
import { SettingIcon } from "@/app/_components/icon/SettingIcon";
import { TimeIcon } from "@/app/_components/icon/TimeIcon";

import type { RouterOutputs } from "@/trpc/react";

type Props = {
  project: RouterOutputs["project"]["get"] | undefined;
  testSessions: RouterOutputs["testSession"]["getAllByProject"] | undefined;
  bugTickets: RouterOutputs["bugTicket"]["getAll"] | undefined;
  testConfigs: RouterOutputs["testConfig"]["getAllByProject"];
  stats: RouterOutputs["testSession"]["getStats"] | undefined;
  bugStats: RouterOutputs["bugTicket"]["getStats"] | undefined;
  isLoading: boolean;
  activeTab: "overview" | "tests" | "bugs" | "settings";
  setActiveTab: (tab: "overview" | "tests" | "bugs" | "settings") => void;
  isTestConfigModalOpen: boolean;
  setIsTestConfigModalOpen: (open: boolean) => void;
  isStartTestModalOpen: boolean;
  setIsStartTestModalOpen: (open: boolean) => void;
  onStartTest: (testConfigId: string) => void;
  isStartingTest: boolean;
  isEditModalOpen: boolean;
  setIsEditModalOpen: (isOpen: boolean) => void;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: (show: boolean) => void;
  onDeleteProject: () => void;
  isDeletingProject: boolean;
};

export const Presentation = ({
  project,
  testSessions,
  bugTickets,
  testConfigs,
  stats,
  bugStats,
  isLoading,
  activeTab,
  setActiveTab,
  setIsTestConfigModalOpen,
  isStartTestModalOpen,
  setIsStartTestModalOpen,
  onStartTest,
  isStartingTest,
  isEditModalOpen,
  setIsEditModalOpen,
  showDeleteConfirm,
  setShowDeleteConfirm,
  onDeleteProject,
  isDeletingProject,
}: Props) => {
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
      className: "bg-gray-100 text-gray-800",
    };

    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo.className}`}
      >
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
      className: "bg-gray-100 text-gray-800",
    };

    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${severityInfo.className}`}
      >
        {severityInfo.label}
      </span>
    );
  };

  const tabs = [
    { id: "overview", label: "概要", icon: KnowledgeIcon },
    { id: "tests", label: "テスト", icon: KnowledgeIcon },
    { id: "bugs", label: "バグ", icon: QuestionIcon },
    { id: "settings", label: "設定", icon: SettingIcon },
  ] as const;

  return (
    <div className={"p-6"}>
      {/* Header */}
      <div className={"mb-6"}>
        <div className={"flex items-start justify-between"}>
          <div>
            <nav className={"mb-2 text-sm"}>
              <Link
                href={"/projects"}
                className={"text-gray-500 hover:text-gray-700"}
              >
                プロジェクト
              </Link>
              <span className={"mx-2 text-gray-400"}>/</span>
              <span className={"text-gray-900"}>{project.name}</span>
            </nav>
            <h1 className={"text-2xl font-bold text-gray-900"}>
              {project.name}
            </h1>
            {project.description && (
              <p className={"mt-1 text-sm text-gray-500"}>
                {project.description}
              </p>
            )}
            <p className={"mt-1 text-sm text-gray-500"}>
              URL:{" "}
              <a
                href={project.url}
                target={"_blank"}
                rel={"noopener noreferrer"}
                className={"text-indigo-600 hover:text-indigo-500"}
              >
                {project.url}
              </a>
            </p>
          </div>
          <Button
            onClick={() => setIsStartTestModalOpen(true)}
            className={"flex items-center gap-2"}
          >
            <KnowledgeIcon size={16} color={"white"} />
            テストを実行
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className={"mb-6 border-b border-gray-200"}>
        <nav className={"-mb-px flex space-x-8"}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 border-b-2 px-1 py-2 text-sm font-medium ${
                  activeTab === tab.id
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                } `}
              >
                <Icon
                  size={16}
                  color={activeTab === tab.id ? "blue" : "grey"}
                />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className={"space-y-6"}>
          {/* Stats Cards */}
          <div className={"grid grid-cols-1 gap-4 md:grid-cols-4"}>
            <div className={"overflow-hidden rounded-lg bg-white shadow"}>
              <div className={"p-5"}>
                <div className={"flex items-center"}>
                  <div className={"flex-shrink-0"}>
                    <KnowledgeIcon size={24} color={"blue"} />
                  </div>
                  <div className={"ml-5 w-0 flex-1"}>
                    <dl>
                      <dt
                        className={"truncate text-sm font-medium text-gray-500"}
                      >
                        総テスト実行数
                      </dt>
                      <dd className={"text-lg font-medium text-gray-900"}>
                        {project._count.testSessions}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className={"overflow-hidden rounded-lg bg-white shadow"}>
              <div className={"p-5"}>
                <div className={"flex items-center"}>
                  <div className={"flex-shrink-0"}>
                    <QuestionIcon size={24} color={"red"} />
                  </div>
                  <div className={"ml-5 w-0 flex-1"}>
                    <dl>
                      <dt
                        className={"truncate text-sm font-medium text-gray-500"}
                      >
                        未解決バグ
                      </dt>
                      <dd className={"text-lg font-medium text-gray-900"}>
                        {project._count.bugTickets}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className={"overflow-hidden rounded-lg bg-white shadow"}>
              <div className={"p-5"}>
                <div className={"flex items-center"}>
                  <div className={"flex-shrink-0"}>
                    <TimeIcon size={24} color={"grey"} />
                  </div>
                  <div className={"ml-5 w-0 flex-1"}>
                    <dl>
                      <dt
                        className={"truncate text-sm font-medium text-gray-500"}
                      >
                        平均実行時間
                      </dt>
                      <dd className={"text-lg font-medium text-gray-900"}>
                        {stats?.averageDuration
                          ? `${Math.round(stats.averageDuration / 60)}分`
                          : "-"}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className={"overflow-hidden rounded-lg bg-white shadow"}>
              <div className={"p-5"}>
                <div className={"flex items-center"}>
                  <div className={"flex-shrink-0"}>
                    <SettingIcon size={24} color={"grey"} />
                  </div>
                  <div className={"ml-5 w-0 flex-1"}>
                    <dl>
                      <dt
                        className={"truncate text-sm font-medium text-gray-500"}
                      >
                        テスト設定
                      </dt>
                      <dd className={"text-lg font-medium text-gray-900"}>
                        {project.testConfigs?.length || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Test Sessions */}
          <div className={"overflow-hidden bg-white shadow sm:rounded-md"}>
            <div
              className={"flex items-center justify-between px-4 py-5 sm:px-6"}
            >
              <h3 className={"text-lg leading-6 font-medium text-gray-900"}>
                最近のテスト実行
              </h3>
              <Link href={`/projects/${project.id}/test-sessions`}>
                <Button variant={"outline"} size={"sm"}>
                  すべて表示
                </Button>
              </Link>
            </div>
            {/* デバッグ情報 */}
            {testSessions && (
              <div className={"px-4 py-2 text-xs text-gray-500"}>
                Total: {testSessions.total}, Sessions:{" "}
                {testSessions.sessions?.length || 0}
              </div>
            )}
            {testSessions?.sessions && testSessions.sessions.length > 0 ? (
              <ul className={"divide-y divide-gray-200"}>
                {testSessions.sessions.slice(0, 5).map((session) => (
                  <li key={session.id}>
                    <Link
                      href={`/projects/${project.id}/test-sessions/${session.id}`}
                    >
                      <div
                        className={
                          "cursor-pointer px-4 py-4 hover:bg-gray-50 sm:px-6"
                        }
                      >
                        <div className={"flex items-center justify-between"}>
                          <div className={"flex items-center"}>
                            <p
                              className={
                                "truncate text-sm font-medium text-indigo-600"
                              }
                            >
                              セッション #{session.id.slice(-8)}
                            </p>
                            <div className={"ml-2"}>
                              {getStatusBadge(session.status)}
                            </div>
                          </div>
                          <div
                            className={
                              "flex items-center text-sm text-gray-500"
                            }
                          >
                            <div className={"mr-1.5 flex-shrink-0"}>
                              <TimeIcon size={16} color={"grey"} />
                            </div>
                            {new Date(session.createdAt).toLocaleString(
                              "ja-JP",
                            )}
                          </div>
                        </div>
                        <div className={"mt-2 sm:flex sm:justify-between"}>
                          <div className={"sm:flex"}>
                            <p
                              className={
                                "flex items-center text-sm text-gray-500"
                              }
                            >
                              {session.testConfig.name} •{" "}
                              {session._count.bugTickets} バグ発見
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={"px-4 py-5 text-center text-gray-500 sm:px-6"}>
                まだテストが実行されていません
              </div>
            )}
          </div>

          {/* Recent Bugs */}
          <div className={"overflow-hidden bg-white shadow sm:rounded-md"}>
            <div
              className={"flex items-center justify-between px-4 py-5 sm:px-6"}
            >
              <h3 className={"text-lg leading-6 font-medium text-gray-900"}>
                最近のバグ
              </h3>
              <Link href={`/projects/${project.id}/bugs`}>
                <Button variant={"outline"} size={"sm"}>
                  すべて表示
                </Button>
              </Link>
            </div>
            {bugTickets && bugTickets.tickets.length > 0 ? (
              <ul className={"divide-y divide-gray-200"}>
                {bugTickets.tickets.slice(0, 5).map((bug) => (
                  <li key={bug.id}>
                    <Link href={`/projects/${project.id}/bugs/${bug.id}`}>
                      <div
                        className={
                          "cursor-pointer px-4 py-4 hover:bg-gray-50 sm:px-6"
                        }
                      >
                        <div className={"flex items-center justify-between"}>
                          <div className={"min-w-0 flex-1"}>
                            <p
                              className={
                                "truncate text-sm font-medium text-gray-900"
                              }
                            >
                              {bug.title}
                            </p>
                            <div className={"mt-1 flex items-center gap-2"}>
                              {getSeverityBadge(bug.severity)}
                              <span className={"text-sm text-gray-500"}>
                                {bug.bugType === "ui" && "UI"}
                                {bug.bugType === "functional" && "機能"}
                                {bug.bugType === "performance" &&
                                  "パフォーマンス"}
                                {bug.bugType === "security" && "セキュリティ"}
                              </span>
                            </div>
                          </div>
                          <div
                            className={
                              "ml-2 flex items-center text-sm text-gray-500"
                            }
                          >
                            <div className={"mr-1.5 flex-shrink-0"}>
                              <TimeIcon size={16} color={"grey"} />
                            </div>
                            {new Date(bug.createdAt).toLocaleDateString(
                              "ja-JP",
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={"px-4 py-5 text-center text-gray-500 sm:px-6"}>
                バグが検出されていません
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "tests" && (
        <div className={"space-y-6"}>
          {/* Test Configs */}
          <div className={"overflow-hidden bg-white shadow sm:rounded-md"}>
            <div
              className={"flex items-center justify-between px-4 py-5 sm:px-6"}
            >
              <h3 className={"text-lg leading-6 font-medium text-gray-900"}>
                テスト設定
              </h3>
              <Button
                onClick={() => setIsTestConfigModalOpen(true)}
                size={"sm"}
                className={"flex items-center gap-2"}
              >
                <AddIcon size={16} color={"white"} />
                新規作成
              </Button>
            </div>
            {testConfigs.length > 0 ? (
              <ul className={"divide-y divide-gray-200"}>
                {testConfigs.map((config) => (
                  <li key={config.id}>
                    <div className={"px-4 py-4 sm:px-6"}>
                      <div className={"flex items-center justify-between"}>
                        <div className={"flex-1"}>
                          <div className={"flex items-center"}>
                            <p className={"text-sm font-medium text-gray-900"}>
                              {config.name}
                            </p>
                            {config.isDefault && (
                              <span
                                className={
                                  "ml-2 inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800"
                                }
                              >
                                デフォルト
                              </span>
                            )}
                          </div>
                          <p className={"mt-1 text-sm text-gray-500"}>
                            モード:{" "}
                            {config.mode === "omakase"
                              ? "おまかせ"
                              : config.mode === "scenario"
                                ? "シナリオ"
                                : "ハイブリッド"}{" "}
                            • ブラウザ: {config.browser} • 最大実行時間:{" "}
                            {config.maxDuration / 60}分
                          </p>
                        </div>
                        <div className={"flex items-center gap-2"}>
                          <Button
                            variant={"outline"}
                            size={"sm"}
                            onClick={() => onStartTest(config.id)}
                          >
                            このテストを実行
                          </Button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={"px-4 py-5 text-center text-gray-500 sm:px-6"}>
                テスト設定がありません
              </div>
            )}
          </div>

          {/* All Test Sessions */}
          <div className={"overflow-hidden bg-white shadow sm:rounded-md"}>
            <div className={"px-4 py-5 sm:px-6"}>
              <h3 className={"text-lg leading-6 font-medium text-gray-900"}>
                すべてのテスト実行
              </h3>
            </div>
            {testSessions && testSessions.sessions.length > 0 ? (
              <ul className={"divide-y divide-gray-200"}>
                {testSessions.sessions.map((session) => (
                  <li key={session.id}>
                    <Link
                      href={`/projects/${project.id}/test-sessions/${session.id}`}
                    >
                      <div
                        className={
                          "cursor-pointer px-4 py-4 hover:bg-gray-50 sm:px-6"
                        }
                      >
                        <div className={"flex items-center justify-between"}>
                          <div className={"flex items-center"}>
                            <p
                              className={
                                "truncate text-sm font-medium text-indigo-600"
                              }
                            >
                              セッション #{session.id.slice(-8)}
                            </p>
                            <div className={"ml-2"}>
                              {getStatusBadge(session.status)}
                            </div>
                          </div>
                          <div
                            className={
                              "flex items-center text-sm text-gray-500"
                            }
                          >
                            <div className={"mr-1.5 flex-shrink-0"}>
                              <TimeIcon size={16} color={"grey"} />
                            </div>
                            {new Date(session.createdAt).toLocaleString(
                              "ja-JP",
                            )}
                          </div>
                        </div>
                        <div className={"mt-2 sm:flex sm:justify-between"}>
                          <div className={"sm:flex"}>
                            <p
                              className={
                                "flex items-center text-sm text-gray-500"
                              }
                            >
                              {session.testConfig.name} •
                              {session._count.testResults} ページテスト済み •
                              {session._count.bugTickets} バグ発見
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={"px-4 py-5 text-center text-gray-500 sm:px-6"}>
                まだテストが実行されていません
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "bugs" && (
        <div className={"space-y-6"}>
          {/* Bug Stats */}
          {bugStats && (
            <div className={"grid grid-cols-1 gap-4 md:grid-cols-4"}>
              <div className={"overflow-hidden rounded-lg bg-white shadow"}>
                <div className={"p-5"}>
                  <dl>
                    <dt
                      className={"truncate text-sm font-medium text-gray-500"}
                    >
                      緊急度別
                    </dt>
                    <dd className={"mt-1 text-sm text-gray-900"}>
                      <div className={"space-y-1"}>
                        <div className={"flex justify-between"}>
                          <span>緊急</span>
                          <span className={"font-medium"}>
                            {bugStats.bySeverity?.critical || 0}
                          </span>
                        </div>
                        <div className={"flex justify-between"}>
                          <span>高</span>
                          <span className={"font-medium"}>
                            {bugStats.bySeverity?.high || 0}
                          </span>
                        </div>
                        <div className={"flex justify-between"}>
                          <span>中</span>
                          <span className={"font-medium"}>
                            {bugStats.bySeverity?.medium || 0}
                          </span>
                        </div>
                        <div className={"flex justify-between"}>
                          <span>低</span>
                          <span className={"font-medium"}>
                            {bugStats.bySeverity?.low || 0}
                          </span>
                        </div>
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>

              <div className={"overflow-hidden rounded-lg bg-white shadow"}>
                <div className={"p-5"}>
                  <dl>
                    <dt
                      className={"truncate text-sm font-medium text-gray-500"}
                    >
                      種類別
                    </dt>
                    <dd className={"mt-1 text-sm text-gray-900"}>
                      <div className={"space-y-1"}>
                        <div className={"flex justify-between"}>
                          <span>UI</span>
                          <span className={"font-medium"}>
                            {bugStats.byType?.ui || 0}
                          </span>
                        </div>
                        <div className={"flex justify-between"}>
                          <span>機能</span>
                          <span className={"font-medium"}>
                            {bugStats.byType?.functional || 0}
                          </span>
                        </div>
                        <div className={"flex justify-between"}>
                          <span>パフォーマンス</span>
                          <span className={"font-medium"}>
                            {bugStats.byType?.performance || 0}
                          </span>
                        </div>
                        <div className={"flex justify-between"}>
                          <span>セキュリティ</span>
                          <span className={"font-medium"}>
                            {bugStats.byType?.security || 0}
                          </span>
                        </div>
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>

              <div className={"overflow-hidden rounded-lg bg-white shadow"}>
                <div className={"p-5"}>
                  <dl>
                    <dt
                      className={"truncate text-sm font-medium text-gray-500"}
                    >
                      ステータス別
                    </dt>
                    <dd className={"mt-1 text-sm text-gray-900"}>
                      <div className={"space-y-1"}>
                        <div className={"flex justify-between"}>
                          <span>未対応</span>
                          <span className={"font-medium"}>
                            {bugStats.byStatus?.open || 0}
                          </span>
                        </div>
                        <div className={"flex justify-between"}>
                          <span>対応中</span>
                          <span className={"font-medium"}>
                            {bugStats.byStatus?.in_progress || 0}
                          </span>
                        </div>
                        <div className={"flex justify-between"}>
                          <span>解決済み</span>
                          <span className={"font-medium"}>
                            {bugStats.byStatus?.resolved || 0}
                          </span>
                        </div>
                        <div className={"flex justify-between"}>
                          <span>クローズ</span>
                          <span className={"font-medium"}>
                            {bugStats.byStatus?.closed || 0}
                          </span>
                        </div>
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          )}

          {/* All Bugs */}
          <div className={"overflow-hidden bg-white shadow sm:rounded-md"}>
            <div className={"px-4 py-5 sm:px-6"}>
              <h3 className={"text-lg leading-6 font-medium text-gray-900"}>
                すべてのバグ
              </h3>
            </div>
            {bugTickets && bugTickets.tickets.length > 0 ? (
              <ul className={"divide-y divide-gray-200"}>
                {bugTickets.tickets.map((bug) => (
                  <li key={bug.id}>
                    <Link href={`/projects/${project.id}/bugs/${bug.id}`}>
                      <div
                        className={
                          "cursor-pointer px-4 py-4 hover:bg-gray-50 sm:px-6"
                        }
                      >
                        <div className={"flex items-center justify-between"}>
                          <div className={"min-w-0 flex-1"}>
                            <p
                              className={
                                "truncate text-sm font-medium text-gray-900"
                              }
                            >
                              {bug.title}
                            </p>
                            <div className={"mt-1 flex items-center gap-2"}>
                              {getSeverityBadge(bug.severity)}
                              <span className={"text-sm text-gray-500"}>
                                {bug.bugType === "ui" && "UI"}
                                {bug.bugType === "functional" && "機能"}
                                {bug.bugType === "performance" &&
                                  "パフォーマンス"}
                                {bug.bugType === "security" && "セキュリティ"}
                              </span>
                              <span className={"text-sm text-gray-500"}>
                                • {bug._count.comments} コメント
                              </span>
                            </div>
                          </div>
                          <div className={"ml-2 flex flex-col items-end"}>
                            <div
                              className={
                                "flex items-center text-sm text-gray-500"
                              }
                            >
                              <div className={"mr-1.5 flex-shrink-0"}>
                                <TimeIcon size={16} color={"grey"} />
                              </div>
                              {new Date(bug.createdAt).toLocaleDateString(
                                "ja-JP",
                              )}
                            </div>
                            <div className={"mt-1"}>
                              {getStatusBadge(bug.status)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={"px-4 py-5 text-center text-gray-500 sm:px-6"}>
                バグが検出されていません
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "settings" && (
        <div className={"space-y-6"}>
          <div className={"overflow-hidden bg-white shadow sm:rounded-lg"}>
            <div className={"px-4 py-5 sm:px-6"}>
              <h3 className={"text-lg leading-6 font-medium text-gray-900"}>
                プロジェクト設定
              </h3>
            </div>
            <div className={"border-t border-gray-200 px-4 py-5 sm:p-0"}>
              <dl className={"sm:divide-y sm:divide-gray-200"}>
                <div
                  className={
                    "py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 sm:py-5"
                  }
                >
                  <dt className={"text-sm font-medium text-gray-500"}>
                    プロジェクト名
                  </dt>
                  <dd
                    className={
                      "mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0"
                    }
                  >
                    {project.name}
                  </dd>
                </div>
                <div
                  className={
                    "py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 sm:py-5"
                  }
                >
                  <dt className={"text-sm font-medium text-gray-500"}>URL</dt>
                  <dd
                    className={
                      "mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0"
                    }
                  >
                    <a
                      href={project.url}
                      target={"_blank"}
                      rel={"noopener noreferrer"}
                      className={"text-indigo-600 hover:text-indigo-500"}
                    >
                      {project.url}
                    </a>
                  </dd>
                </div>
                <div
                  className={
                    "py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 sm:py-5"
                  }
                >
                  <dt className={"text-sm font-medium text-gray-500"}>説明</dt>
                  <dd
                    className={
                      "mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0"
                    }
                  >
                    {project.description || "-"}
                  </dd>
                </div>
                <div
                  className={
                    "py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 sm:py-5"
                  }
                >
                  <dt className={"text-sm font-medium text-gray-500"}>
                    作成日
                  </dt>
                  <dd
                    className={
                      "mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0"
                    }
                  >
                    {new Date(project.createdAt).toLocaleDateString("ja-JP")}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <div className={"flex justify-end gap-4"}>
            <Button
              variant={"outline"}
              onClick={() => setIsEditModalOpen(true)}
            >
              プロジェクトを編集
            </Button>
            <Button
              variant={"danger"}
              onClick={() => setShowDeleteConfirm(true)}
            >
              プロジェクトを削除
            </Button>
          </div>
        </div>
      )}

      {/* Start Test Modal */}
      {isStartTestModalOpen && (
        <Modal
          isOpen={true}
          onOpenChange={(open) => !open && setIsStartTestModalOpen(false)}
          title={"テストを実行"}
        >
          <div className={"space-y-4"}>
            <p className={"text-sm text-gray-500"}>
              実行するテスト設定を選択してください
            </p>

            {testConfigs.length > 0 ? (
              <div className={"space-y-2"}>
                {testConfigs.map((config) => (
                  <button
                    key={config.id}
                    onClick={() => onStartTest(config.id)}
                    disabled={isStartingTest}
                    className={
                      "w-full rounded-lg border border-gray-200 p-4 text-left transition-colors hover:border-indigo-500 hover:bg-indigo-50"
                    }
                  >
                    <div className={"flex items-center justify-between"}>
                      <div>
                        <p className={"font-medium text-gray-900"}>
                          {config.name}
                          {config.isDefault && (
                            <span
                              className={
                                "ml-2 inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800"
                              }
                            >
                              デフォルト
                            </span>
                          )}
                        </p>
                        <p className={"mt-1 text-sm text-gray-500"}>
                          モード:{" "}
                          {config.mode === "omakase"
                            ? "おまかせ"
                            : config.mode === "scenario"
                              ? "シナリオ"
                              : "ハイブリッド"}{" "}
                          • ブラウザ: {config.browser}
                        </p>
                      </div>
                      <svg
                        className={"h-5 w-5 text-gray-400"}
                        fill={"currentColor"}
                        viewBox={"0 0 20 20"}
                      >
                        <path
                          fillRule={"evenodd"}
                          d={
                            "M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                          }
                          clipRule={"evenodd"}
                        />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className={"py-8 text-center text-gray-500"}>
                テスト設定がありません。先にテスト設定を作成してください。
              </div>
            )}

            <div className={"flex justify-end gap-3"}>
              <Button
                variant={"outline"}
                onClick={() => setIsStartTestModalOpen(false)}
                disabled={isStartingTest}
              >
                キャンセル
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Project Modal */}
      {isEditModalOpen && project && (
        <EditProjectModal
          projectId={project.id}
          initialData={{
            name: project.name,
            description: project.description,
            url: project.url,
          }}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={onDeleteProject}
          title={"プロジェクトを削除"}
          message={
            "このプロジェクトを削除してもよろしいですか？関連するすべてのテストセッション、バグチケット、テスト設定も削除されます。この操作は取り消せません。"
          }
          confirmText={"削除する"}
          cancelText={"キャンセル"}
          variant={"danger"}
          isLoading={isDeletingProject}
        />
      )}
    </div>
  );
};
