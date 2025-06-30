import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { NextResponse } from "next/server";

export const auth0 = new Auth0Client({
  onCallback: async (error, context, session) => {
    try {
      const userId = session?.user.sub;
      const email = session?.user.email;
      // メールアドレスに特殊文字が含まれている場合を考えて、URLエンコードする
      const encodedEmail = encodeURIComponent(email || "");
      const name = session?.user.name;
      // Auth0セッション情報とサービス側で保持しているユーザー情報との整合性をチェックする
      await fetch(
        `${process.env.APP_BASE_URL}/api/verification?userId=${userId}&email=${encodedEmail}&name=${name}`,
      );
    } catch (error) {
      console.error(error);
    }
    return NextResponse.redirect(
      new URL(context.returnTo || "/", process.env.APP_BASE_URL),
    );
  },
});
