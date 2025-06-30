"use client";

import Link from "next/link";

import { Button } from "@/app/_components/common/Button";
import { LoadingSection } from "@/app/_components/common/LoadingSection";
import { KnowledgeIcon } from "@/app/_components/icon/KnowledgeIcon";
import { QuestionIcon } from "@/app/_components/icon/QuestionIcon";
import { TimeIcon } from "@/app/_components/icon/TimeIcon";

import type { RouterOutputs } from "@/trpc/react";

type Props = {
  runningSessions: RouterOutputs["testSession"]["getAllRunning"] | undefined;
  organization: RouterOutputs["organization"]["getCurrent"] | undefined;
  isLoading: boolean;
};

export const TestMonitorAreaPresentation = ({
  runningSessions,
  organization,
  isLoading,
}: Props) => {
  if (isLoading) {
    return <LoadingSection />;
  }

  const getElapsedTime = (startedAt: Date | string | null) => {
    if (!startedAt) return "0分";
    const start = new Date(startedAt);
    const now = new Date();
    const elapsedMs = now.getTime() - start.getTime();
    const minutes = Math.floor(elapsedMs / 60000);
    return `${minutes}分`;
  };

  const getProgressBar = (session: any) => {
    // Mock progress calculation
    const progress = Math.min(90, session._count.testResults * 10);
    return (
      <div className={"w-full bg-gray-200 rounded-full h-2"}>
        <div 
          className={"bg-indigo-600 h-2 rounded-full transition-all duration-500"}
          style={{ width: `${progress}%` }}
        />
      </div>
    );
  };

  return (
    <div className={"p-6"}>
      {/* Header */}
      <div className={"mb-6"}>
        <h1 className={"text-2xl font-bold text-gray-900"}>テスト実行モニター</h1>
        <p className={"mt-1 text-sm text-gray-500"}>
          現在実行中のテストをリアルタイムで監視できます
        </p>
      </div>

      {/* Organization Stats */}
      {organization && (
        <div className={"bg-white p-4 rounded-lg shadow mb-6"}>
          <div className={"flex items-center justify-between"}>
            <div>
              <p className={"text-sm text-gray-500"}>組織: {organization.name}</p>
              <p className={"text-sm text-gray-500"}>
                今月のテスト実行: {organization._count?.testSessions || 0} / {organization.monthlyTestLimit}
              </p>
            </div>
            <div className={"flex items-center gap-2"}>
              <div className={"h-2 w-32 bg-gray-200 rounded-full"}>
                <div 
                  className={"h-2 bg-indigo-600 rounded-full"}
                  style={{ 
                    width: `${Math.min(100, ((organization._count?.testSessions || 0) / organization.monthlyTestLimit) * 100)}%` 
                  }}
                />
              </div>
              <span className={"text-sm text-gray-700"}>
                {Math.round(((organization._count?.testSessions || 0) / organization.monthlyTestLimit) * 100)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Running Sessions */}
      <div className={"bg-white shadow overflow-hidden sm:rounded-md"}>
        <div className={"px-4 py-5 sm:px-6"}>
          <h2 className={"text-lg leading-6 font-medium text-gray-900"}>
            実行中のテスト ({runningSessions?.length || 0})
          </h2>
        </div>
        {runningSessions && runningSessions.length > 0 ? (
          <ul className={"divide-y divide-gray-200"}>
            {runningSessions.map((session) => (
              <li key={session.id}>
                <div className={"px-4 py-6 sm:px-6"}>
                  <div className={"flex items-center justify-between mb-4"}>
                    <div>
                      <Link 
                        href={`/projects/${session.project.id}/test-sessions/${session.id}`}
                        className={"text-sm font-medium text-indigo-600 hover:text-indigo-500"}
                      >
                        {session.project.name} - セッション #{session.id.slice(-8)}
                      </Link>
                      <p className={"mt-1 text-sm text-gray-500"}>
                        {session.testConfig.name} • {session.testConfig.mode}
                      </p>
                    </div>
                    <div className={"flex items-center gap-4"}>
                      <span className={"inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"}>
                        実行中
                      </span>
                      <Button
                        variant={"outline"}
                        size={"sm"}
                        onClick={() => {
                          // Stop test functionality
                          console.log("Stop test:", session.id);
                        }}
                      >
                        停止
                      </Button>
                    </div>
                  </div>

                  <div className={"space-y-3"}>
                    {/* Progress Bar */}
                    <div>
                      <div className={"flex justify-between text-sm text-gray-500 mb-1"}>
                        <span>進行状況</span>
                        <span>推定 {Math.min(90, session._count.testResults * 10)}%</span>
                      </div>
                      {getProgressBar(session)}
                    </div>

                    {/* Stats */}
                    <div className={"grid grid-cols-1 md:grid-cols-4 gap-4 text-sm"}>
                      <div className={"flex items-center"}>
                        <TimeIcon size={16} color={"grey"} />
                        <span className={"ml-2 text-gray-500"}>経過時間:</span>
                        <span className={"ml-1 font-medium"}>{getElapsedTime(session.startedAt)}</span>
                      </div>
                      <div className={"flex items-center"}>
                        <KnowledgeIcon size={16} color={"grey"} />
                        <span className={"ml-2 text-gray-500"}>テスト済み:</span>
                        <span className={"ml-1 font-medium"}>{session._count.testResults} ページ</span>
                      </div>
                      <div className={"flex items-center"}>
                        <QuestionIcon size={16} color={"red"} />
                        <span className={"ml-2 text-gray-500"}>バグ検出:</span>
                        <span className={"ml-1 font-medium"}>{session._count.bugTickets}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className={"px-4 py-8 text-center text-gray-500"}>
            現在実行中のテストはありません
          </div>
        )}
      </div>
    </div>
  );
};