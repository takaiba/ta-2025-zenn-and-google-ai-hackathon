import { useEffect, useRef, useState } from "react";
import { api } from "@/trpc/react";

interface UseTestSessionPollingOptions {
  enabled?: boolean;
  interval?: number;
  onUpdate?: (data: any) => void;
}

export function useTestSessionPolling(
  sessionId: string | undefined,
  options: UseTestSessionPollingOptions = {}
) {
  const { 
    enabled = true, 
    interval = 3000, // 3秒ごとにポーリング
    onUpdate 
  } = options;
  
  const intervalRef = useRef<NodeJS.Timeout>();
  const [lastFetchTime, setLastFetchTime] = useState(new Date());

  // テストセッション詳細を取得
  const { data: session, refetch: refetchSession } = api.testSession.get.useQuery(
    { id: sessionId! },
    { 
      enabled: !!sessionId && enabled,
      refetchInterval: false // 手動でrefetchするため
    }
  );

  // ジョブキュー状態を取得
  const { data: jobs, refetch: refetchJobs } = api.jobQueue.getByTestSession.useQuery(
    { testSessionId: sessionId! },
    { 
      enabled: !!sessionId && enabled,
      refetchInterval: false
    }
  );

  useEffect(() => {
    if (!enabled || !sessionId) return;

    // 初回実行
    void refetchSession();
    void refetchJobs();
    setLastFetchTime(new Date());

    // ポーリング設定
    intervalRef.current = setInterval(() => {
      // セッションが完了していない場合のみポーリング継続
      if (session?.status === "pending" || session?.status === "running") {
        void refetchSession();
        void refetchJobs();
        setLastFetchTime(new Date());
        
        if (onUpdate) {
          onUpdate({ session, jobs });
        }
      } else {
        // 完了したらポーリング停止
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      }
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, sessionId, interval, session?.status, refetchSession, refetchJobs, onUpdate, session, jobs]);

  return {
    session,
    jobs,
    isRunning: session?.status === "running",
    isPending: session?.status === "pending",
    isCompleted: session?.status === "completed",
    isFailed: session?.status === "failed",
    lastFetchTime, // 最後にフェッチした時刻
    refetch: () => {
      void refetchSession();
      void refetchJobs();
      setLastFetchTime(new Date());
    }
  };
}