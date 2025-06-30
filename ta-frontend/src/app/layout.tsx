import "./globals.css";
import { Auth0Provider } from "@auth0/nextjs-auth0";
import { headers } from "next/headers";
import { Toaster } from "sonner";

import { auth0 } from "@/lib/auth0";

import { TRPCReactProvider } from "../../trpc/client";
import { api } from "../../trpc/server";

import { Layout } from "./_components/layout/Layout";
import { Login } from "./_components/layout/Login";
import { NeedEmailVerification } from "./_components/layout/NeedEmailVerification";
import { NotAllowed } from "./_components/layout/NotAllowed";
import { getOidcLogoutUrl } from "./_utils/urlGenerator";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "QA³",
  description: "QA³ - Quality Assurance Platform",
};

const RootLayout = async ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const header = await headers();
  const url = new URL(header.get("x-url") || "");
  const pathname = url.pathname;

  // healthcheckの場合は何もしない
  if (pathname.startsWith("/healthcheck")) {
    return <>ok</>;
  }

  const isPublicPage = pathname.includes("/terms");
  const session = await auth0.getSession();
  const userId = session?.user.sub;
  const email = session?.user.email;

  /** ユーザー情報がAuth0から正常に取得できているか */
  const isVerifiedSession =
    !!session?.user &&
    !!session.user.sub &&
    !!session.user.email &&
    !!session.user.name;
  /** メール認証が完了しているか */
  const isEmailVerified = !!session?.user?.email_verified;
  /** アプリケーション的に許可されたユーザーかどうか */
  const isAllowedUser =
    userId && email
      ? await api.auth.checkAllowedUser({ userId, email })
      : false;

  const logoutUrl = await getOidcLogoutUrl();

  return (
    <html lang={"ja"}>
      <body>
        {/* Base-UI用のclassName */}
        <div className={"Root"}>
          <Auth0Provider>
            <TRPCReactProvider>
              <div
                className={`bg-bg-grey flex h-dvh w-screen items-center justify-center`}
              >
                {isPublicPage ? (
                  children
                ) : !isVerifiedSession ? (
                  <Login />
                ) : isVerifiedSession && !isEmailVerified ? (
                  <NeedEmailVerification logoutUrl={logoutUrl} />
                ) : isVerifiedSession && isEmailVerified && !isAllowedUser ? (
                  <NotAllowed logoutUrl={logoutUrl} />
                ) : (
                  <Layout>{children}</Layout>
                )}
              </div>
              <Toaster />
            </TRPCReactProvider>
          </Auth0Provider>
        </div>
      </body>
    </html>
  );
};

export default RootLayout;
