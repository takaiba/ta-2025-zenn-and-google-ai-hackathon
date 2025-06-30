"use client";

import Link from "next/link";

import { Button } from "@/app/_components/common/Button";
import { LoadingSection } from "@/app/_components/common/LoadingSection";
import { AddIcon } from "@/app/_components/icon/AddIcon";
import { KnowledgeIcon } from "@/app/_components/icon/KnowledgeIcon";
import { QuestionIcon } from "@/app/_components/icon/QuestionIcon";
import { TimeIcon } from "@/app/_components/icon/TimeIcon";

import { CreateProjectModal } from "../CreateProjectModal/container";

import type { RouterOutputs } from "@/trpc/react";

type Props = {
  projects: RouterOutputs["project"]["getAll"];
  organization: RouterOutputs["organization"]["getCurrent"] | undefined;
  usageStats: RouterOutputs["organization"]["getUsageStats"] | undefined;
  isLoading: boolean;
  isCreateModalOpen: boolean;
  onCreateProject: () => void;
  onCloseModal: () => void;
};

export const Presentation = ({
  projects,
  organization,
  usageStats,
  isLoading,
  isCreateModalOpen,
  onCreateProject,
  onCloseModal,
}: Props) => {
  if (isLoading) {
    return <LoadingSection />;
  }

  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("ja-JP");
  };

  const getStatusBadge = (status: string | undefined) => {
    if (!status) return null;
    
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

  return (
    <div className={"p-6"}>
      {/* Header */}
      <div className={"mb-6"}>
        <div className={"flex justify-between items-start"}>
          <div>
            <h1 className={"text-2xl font-bold text-gray-900"}>プロジェクト</h1>
            <p className={"mt-1 text-sm text-gray-500"}>
              QA³でテストを実行するプロジェクトを管理します
            </p>
          </div>
          <Button
            onClick={onCreateProject}
            className={"flex items-center gap-2"}
          >
            <AddIcon size={16} color={"white"} />
            新規プロジェクト
          </Button>
        </div>

        {/* Usage Stats */}
        {usageStats && (
          <div className={"mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4"}>
            <div className={"flex items-center"}>
              <p className={"text-sm font-medium text-blue-900"}>
                🎉 無制限にご利用いただけます
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Project List */}
      {projects.length === 0 ? (
        <div className={"flex items-center justify-center py-12 bg-white rounded-lg border border-gray-200"}>
          <div className={"text-center"}>
            <div className={"flex justify-center mb-4"}>
              <KnowledgeIcon size={48} color={"grey"} />
            </div>
            <h3 className={"mt-2 text-sm font-medium text-gray-900"}>プロジェクトがありません</h3>
            <p className={"mt-1 text-sm text-gray-500"}>
              新しいプロジェクトを作成して、自動テストを開始しましょう
            </p>
            <div className={"mt-6"}>
              <Button onClick={onCreateProject}>
                <div className={"flex items-center gap-2"}>
                  <AddIcon size={20} color={"white"} />
                  最初のプロジェクトを作成
                </div>
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className={"bg-white shadow overflow-hidden sm:rounded-md"}>
          <ul className={"divide-y divide-gray-200"}>
            {projects.map((project) => (
              <li key={project.id}>
                <Link href={`/projects/${project.id}`}>
                  <div className={"px-4 py-4 hover:bg-gray-50 sm:px-6 cursor-pointer"}>
                    <div className={"flex items-center justify-between"}>
                      <div className={"flex-1 min-w-0"}>
                        <div className={"flex items-center"}>
                          <h3 className={"text-lg font-medium text-indigo-600 truncate"}>
                            {project.name}
                          </h3>
                          {project.testSessions[0] && (
                            <div className={"ml-4"}>
                              {getStatusBadge(project.testSessions[0].status)}
                            </div>
                          )}
                        </div>
                        <div className={"mt-2 flex items-center text-sm text-gray-500"}>
                          <div className={"flex-shrink-0 mr-1.5"}>
                            <KnowledgeIcon size={20} color={"grey"} />
                          </div>
                          <span>{project._count.testSessions} テスト実行</span>
                          
                          {project._count.bugTickets > 0 && (
                            <>
                              <div className={"flex-shrink-0 ml-4 mr-1.5"}>
                                <QuestionIcon size={20} color={"grey"} />
                              </div>
                              <span className={"text-red-600 font-medium"}>
                                {project._count.bugTickets} 件の未解決バグ
                              </span>
                            </>
                          )}
                          
                          {project.testSessions[0] && (
                            <>
                              <div className={"flex-shrink-0 ml-4 mr-1.5"}>
                                <TimeIcon size={20} color={"grey"} />
                              </div>
                              <span>最終実行: {formatDate(project.testSessions[0].createdAt)}</span>
                            </>
                          )}
                        </div>
                        {project.description && (
                          <p className={"mt-1 text-sm text-gray-600"}>{project.description}</p>
                        )}
                      </div>
                      <div className={"ml-5 flex-shrink-0"}>
                        <svg
                          className={"h-5 w-5 text-gray-400"}
                          fill={"currentColor"}
                          viewBox={"0 0 20 20"}
                        >
                          <path
                            fillRule={"evenodd"}
                            d={"M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"}
                            clipRule={"evenodd"}
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Create Project Modal */}
      {isCreateModalOpen && (
        <CreateProjectModal onClose={onCloseModal} />
      )}
    </div>
  );
};