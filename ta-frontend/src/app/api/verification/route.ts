import { NextRequest, NextResponse } from "next/server";

import { api } from "../../../../trpc/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("userId");
  // メールアドレスはエンコードされているので、デコードする
  const email = decodeURIComponent(searchParams.get("email") || "");
  const name = searchParams.get("name");
  if (!userId || !email || !name) {
    return NextResponse.json(
      { error: "Auth0からセッション情報を取得できません" },
      { status: 400 },
    );
  }
  await api.auth.checkRegistration({ userId, email, name });
  return NextResponse.json({ message: "ok" });
}
