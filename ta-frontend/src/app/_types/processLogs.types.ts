/**
 * プロセスログの型定義
 */

// プロセスログの既知のタイプを列挙型として定義
export enum ProcessLogTypeEnum {
  Process = "process",
  QuestionAnswerGenerateProcess = "question_answer_generate_process",
  SseEvent = "sse_event",
  TileGenerate = "title_generate",
}

// プロセスログのタイプ定義 (列挙型 + 将来追加される可能性のある文字列)
export type ProcessLogType = ProcessLogTypeEnum | string;

// 基本的なプロセスログの共通インターフェース
export interface BaseProcessLog {
  type: ProcessLogType;
  data: string; // JSON文字列形式
}

// プロセスデータインターフェース
export interface ProcessData {
  ticket_id: string;
  status: "started" | "finished";
}

// 質問回答生成プロセスのデータ
export interface QuestionAnswerGenerateProcessData {
  status: "started" | "finished";
  response_mode?: string;
  response_status?: number;
  result_code?: string;
  answer_text_length?: number;
  answer_text_preview?: string;
}

// SSEイベントのデータ共通部分
export interface SseEventData {
  event: string;
  workflow_run_id: string;
  task_id: string;
  data: unknown;
}

// ワークフロー開始イベントのデータ
export interface WorkflowStartedData {
  id: string;
  workflow_id: string;
  sequence_number: number;
  created_at: number;
}

// ノード開始イベントのデータ
export interface NodeStartedData {
  id: string;
  node_id: string;
  node_type: string;
  title: string;
  index: number;
  predecessor_node_id: string | null;
  created_at: number;
  extras: Record<string, unknown>;
  parallel_id: string | null;
  parallel_start_node_id: string | null;
  parent_parallel_id: string | null;
  parent_parallel_start_node_id: string | null;
  iteration_id: string | null;
  loop_id: string | null;
  parallel_run_id: string | null;
  agent_strategy: string | null;
}

// ノード完了イベントのデータ
export interface NodeFinishedData extends NodeStartedData {
  status: string;
  error: string | null;
  elapsed_time: number;
  execution_metadata: Record<string, unknown> | null;
  finished_at: number;
  files: unknown[];
}

// パラレルブランチ開始イベントのデータ
export interface ParallelBranchStartedData {
  parallel_id: string;
  parallel_branch_id: string;
  parent_parallel_id: string | null;
  parent_parallel_start_node_id: string | null;
  iteration_id: string | null;
  loop_id: string | null;
  created_at: number;
}

// パラレルブランチ完了イベントのデータ
export interface ParallelBranchFinishedData extends ParallelBranchStartedData {
  status: string;
  error: string | null;
}

// ワークフロー完了イベントのデータ
export interface WorkflowFinishedData {
  id: string;
  workflow_id: string;
  sequence_number: number;
  status: string;
  error: string | null;
  elapsed_time: number;
  total_tokens: number;
  total_steps: number;
  created_by: {
    id: string;
    user: string;
  };
  created_at: number;
  finished_at: number;
  exceptions_count: number;
  files: unknown[];
}

// 各タイプのログデータを厳密に型付けするヘルパー型
export type ProcessLogData =
  | { type: ProcessLogTypeEnum.Process; data: ProcessData }
  | {
      type: ProcessLogTypeEnum.QuestionAnswerGenerateProcess;
      data: QuestionAnswerGenerateProcessData;
    }
  | { type: ProcessLogTypeEnum.SseEvent; data: SseEventData }
  | { type: string; data: Record<string, unknown> };
