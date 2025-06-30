/**
 * エラーコード定義
 * このファイルでは、アプリケーション全体で使用されるエラーコードとエラーメッセージを定義します。
 */

// ヒアリング関連のエラーコード
export const DEFAULT_HEARING_USER_NOT_FOUND = "default_hearing_user_not_found";

// API関連のエラーコード
export const API_REQUEST_FAILED = "api_request_failed";
export const API_RESPONSE_INVALID = "api_response_invalid";

// 一般的なエラーコード
export const INTERNAL_SERVER_ERROR = "internal_server_error";
export const DATABASE_ERROR = "database_error";
export const INVALID_INPUT = "invalid_input";

// エラーコードとメッセージのマッピング
export const ERROR_MESSAGES: Record<string, string> = {
  // ヒアリング関連
  [DEFAULT_HEARING_USER_NOT_FOUND]:
    "デフォルトヒアリング担当者が設定されていません。",

  // API関連
  [API_REQUEST_FAILED]: "APIリクエストが失敗しました。",
  [API_RESPONSE_INVALID]: "APIレスポンスが無効です。",

  // 一般
  [INTERNAL_SERVER_ERROR]: "内部サーバーエラーが発生しました。",
  [DATABASE_ERROR]: "データベースエラーが発生しました。",
  [INVALID_INPUT]: "入力値が無効です。",
};

/**
 * エラーコードからメッセージを取得する関数
 *
 * @param errorCode エラーコード
 * @returns エラーメッセージ
 */
export const getErrorMessage = (errorCode: string): string => {
  return ERROR_MESSAGES[errorCode] || "不明なエラーが発生しました。";
};
