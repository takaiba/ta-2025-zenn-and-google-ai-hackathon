"server-only";

import { headers } from "next/headers";

import { auth0 } from "@/lib/auth0";

/**
 * Auth0のOIDCログアウトURLを生成する
 *
 * ログアウトに関しては基本的にこのURLを使用する
 */
export const getOidcLogoutUrl = async () => {
  const session = await auth0.getSession();
  const headersList = await headers();
  const host = headersList.get("x-host");
  const protocol = "https";
  const domainUrl = `${protocol}://${host}`;
  const logoutUrl = `${process.env.AUTH0_DOMAIN}/oidc/logout?client_id=${process.env.AUTH0_CLIENT_ID}&logout_hint=${session?.user.sid}&post_logout_redirect_uri=${domainUrl}/auth/logout`;

  return logoutUrl;
};
