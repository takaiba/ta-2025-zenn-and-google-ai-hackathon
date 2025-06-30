/**
 * デモモード用の認証ヘルパー
 */

export const isDemoMode = () => {
  return process.env.SKIP_AUTH === "true";
};

export const getDemoUser = () => {
  if (!isDemoMode()) {
    return null;
  }

  return {
    sub: "demo-user-001",
    email: process.env.DEMO_USER_EMAIL || "demo@qa3.example.com",
    name: process.env.DEMO_USER_NAME || "デモユーザー",
    email_verified: true,
  };
};

export const getDemoSession = () => {
  const user = getDemoUser();
  if (!user) {
    return null;
  }

  return {
    user,
    idToken: "demo-token",
    accessToken: "demo-access-token",
    accessTokenScope: "openid profile email",
    refreshToken: "demo-refresh-token",
  };
};