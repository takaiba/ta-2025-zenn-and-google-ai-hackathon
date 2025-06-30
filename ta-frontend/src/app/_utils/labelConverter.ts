export const roleToJapanese = (role: string) => {
  switch (role) {
    case "admin":
      return "管理者";
    case "organizationAdmin":
      return "組織管理者";
    case "user":
      return "ユーザー";
    default:
      return role;
  }
};

export const statusToJapanese = (status: string) => {
  switch (status) {
    case "open":
      return "継続中";
    case "closed":
      return "終了";
    case "resolved":
      return "解決済み";
    default:
      return status;
  }
};

export const aiStatusToJapanese = (aiStatus: string) => {
  switch (aiStatus) {
    case "queued":
      return "推論中";
    case "answered":
      return "回答済み";
    case "hearing_queue":
      return "回答待ち";
    case "human_waiting":
      return "回答待ち";
    case "fulfilled_answer":
      return "回答済み";
    default:
      return aiStatus;
  }
};

export const modeToJapanese = (mode: string) => {
  switch (mode) {
    case "faq":
      return "AIとの質疑応答";
    case "hearing":
      return "人間からの質問";
    case "ai_hearing":
      return "AIからの質問";
    default:
      return mode;
  }
};

export const knowledgeToolTypeToJapanese = (type: string | null) => {
  if (!type) {
    return "なし";
  }
  switch (type) {
    case "crawler":
      return "クローラー";
    case "notion":
      return "Notion";
    case "slack":
      return "Slack";
    default:
      return type;
  }
};
