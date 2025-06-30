import { NextResponse, userAgent, type NextRequest } from "next/server";

import { auth0 } from "./lib/auth0";

export const middleware = async (request: NextRequest) => {
  // ヘッダーの初期設定
  const headers = new Headers(request.headers);

  // URLを追加
  headers.set("x-url", request.url);
  // ホストを追加
  headers.set("x-host", request.headers.get("host") || "");
  // IPを追加
  let ip = request.headers.get("x-real-ip");
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (!ip && forwardedFor) {
    ip = forwardedFor.split(",").at(0) ?? "";
  }
  headers.set("x-ip", ip ?? "");
  // デバイスタイプ
  const { device } = userAgent(request);
  const viewport = device.type === "mobile" ? "mobile" : "desktop";
  headers.set("x-viewport", viewport);

  // ヘッダー情報をAuth0レスポンスにマージ
  const authRes = await auth0.middleware(request);
  headers.forEach((value, key) => {
    authRes.headers.set(key, value);
  });

  // /authはAuth0の専用処理を走らせるためAuth0レスポンスを返す
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/auth")) {
    return authRes;
  }

  // それ以外は通常通りNextResponseを返す
  return NextResponse.next({
    request: {
      headers,
    },
  });
};
