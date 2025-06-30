"use client";

import { useState } from "react";

import { Button } from "@/app/_components/common/Button";
import { LoadingSection } from "@/app/_components/common/LoadingSection";
import { SettingIcon } from "@/app/_components/icon/SettingIcon";

import type { RouterOutputs } from "@/trpc/react";


type Props = {
  projects: RouterOutputs["project"]["getAll"];
  integrations: RouterOutputs["integration"]["getAll"] | undefined;
  isLoading: boolean;
  selectedProjectId: string | null;
  onProjectChange: (projectId: string | null) => void;
};

export const IntegrationSettingsAreaPresentation = ({
  projects,
  integrations,
  isLoading,
  selectedProjectId,
  onProjectChange,
}: Props) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  if (isLoading) {
    return <LoadingSection />;
  }

  const integrationTypes = [
    {
      id: "slack",
      name: "Slack",
      description: "バグ検出時にSlackチャンネルに通知を送信します",
      icon: "🔔",
      configured: integrations?.integrations.some(i => i.type === "slack" && i.isActive),
    },
    {
      id: "github",
      name: "GitHub",
      description: "バグをGitHub Issuesに自動作成します",
      icon: "🐙",
      configured: integrations?.integrations.some(i => i.type === "github" && i.isActive),
    },
    {
      id: "jira",
      name: "Jira",
      description: "バグをJiraチケットとして自動作成します",
      icon: "📋",
      configured: integrations?.integrations.some(i => i.type === "jira" && i.isActive),
    },
    {
      id: "webhook",
      name: "Webhook",
      description: "カスタムWebhookエンドポイントに通知を送信します",
      icon: "🔗",
      configured: integrations?.integrations.some(i => i.type === "webhook" && i.isActive),
    },
  ];

  return (
    <div className={"p-6"}>
      {/* Header */}
      <div className={"mb-6"}>
        <h1 className={"text-2xl font-bold text-gray-900"}>統合設定</h1>
        <p className={"mt-1 text-sm text-gray-500"}>
          外部サービスとの連携を設定します
        </p>
      </div>

      {/* Project Selector */}
      <div className={"bg-white p-4 rounded-lg shadow mb-6"}>
        <div className={"flex items-center gap-4"}>
          <label className={"text-sm font-medium text-gray-700"}>
            プロジェクト:
          </label>
          <select
            value={selectedProjectId || ""}
            onChange={(e) => onProjectChange(e.target.value || null)}
            className={"block w-64 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"}
          >
            <option value={""}>プロジェクトを選択</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedProjectId ? (
        <>
          {/* Integration Types Grid */}
          <div className={"grid grid-cols-1 md:grid-cols-2 gap-6 mb-6"}>
            {integrationTypes.map((type) => (
              <div
                key={type.id}
                className={"bg-white overflow-hidden shadow rounded-lg"}
              >
                <div className={"p-6"}>
                  <div className={"flex items-start justify-between"}>
                    <div className={"flex items-start"}>
                      <div className={"text-3xl mr-4"}>{type.icon}</div>
                      <div>
                        <h3 className={"text-lg font-medium text-gray-900"}>
                          {type.name}
                        </h3>
                        <p className={"mt-1 text-sm text-gray-500"}>
                          {type.description}
                        </p>
                      </div>
                    </div>
                    <div className={"ml-4"}>
                      {type.configured ? (
                        <span className={"inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"}>
                          設定済み
                        </span>
                      ) : (
                        <span className={"inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"}>
                          未設定
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={"mt-4"}>
                    <Button
                      variant={type.configured ? "outline" : "filled"}
                      size={"sm"}
                      onClick={() => {
                        // Open configuration modal for this type
                        console.log("Configure", type.id);
                      }}
                    >
                      <SettingIcon size={16} color={type.configured ? "grey" : "white"} />
                      {type.configured ? "設定変更" : "設定する"}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Configured Integrations List */}
          {integrations && integrations.integrations.length > 0 && (
            <div className={"bg-white shadow overflow-hidden sm:rounded-md"}>
              <div className={"px-4 py-5 sm:px-6"}>
                <h3 className={"text-lg leading-6 font-medium text-gray-900"}>
                  設定済みの統合
                </h3>
              </div>
              <ul className={"divide-y divide-gray-200"}>
                {integrations.integrations.map((integration) => (
                  <li key={integration.id}>
                    <div className={"px-4 py-4 sm:px-6"}>
                      <div className={"flex items-center justify-between"}>
                        <div className={"flex items-center"}>
                          <div className={"text-2xl mr-3"}>
                            {integration.type === "slack" && "🔔"}
                            {integration.type === "github" && "🐙"}
                            {integration.type === "jira" && "📋"}
                            {integration.type === "webhook" && "🔗"}
                          </div>
                          <div>
                            <p className={"text-sm font-medium text-gray-900"}>
                              {integration.name}
                            </p>
                            <p className={"text-sm text-gray-500"}>
                              {integration.type.charAt(0).toUpperCase() + integration.type.slice(1)}
                            </p>
                          </div>
                        </div>
                        <div className={"flex items-center gap-4"}>
                          <label className={"flex items-center"}>
                            <input
                              type={"checkbox"}
                              checked={integration.isActive}
                              onChange={() => {
                                // Toggle integration
                                console.log("Toggle", integration.id);
                              }}
                              className={"h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"}
                            />
                            <span className={"ml-2 text-sm text-gray-700"}>有効</span>
                          </label>
                          <Button
                            variant={"outline"}
                            size={"sm"}
                            onClick={() => {
                              // Edit integration
                              console.log("Edit", integration.id);
                            }}
                          >
                            編集
                          </Button>
                          <Button
                            variant={"danger"}
                            size={"sm"}
                            onClick={() => {
                              // Delete integration
                              console.log("Delete", integration.id);
                            }}
                          >
                            削除
                          </Button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <div className={"bg-white rounded-lg shadow p-8 text-center"}>
          <div className={"mx-auto mb-4 w-fit"}>
            <SettingIcon size={48} color={"grey"} />
          </div>
          <p className={"text-gray-500"}>
            統合を設定するプロジェクトを選択してください
          </p>
        </div>
      )}
    </div>
  );
};