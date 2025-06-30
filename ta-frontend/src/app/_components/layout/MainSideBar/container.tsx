import { getIsMobile } from "@/app/_utils/deviceChecker";
import { checkEnvironment } from "@/app/_utils/envGetter";
import { getOidcLogoutUrl } from "@/app/_utils/urlGenerator";

import { api } from "../../../../../trpc/server";

import { MainSideBarPresentation } from "./presentation";

export const MainSideBarContainer = async () => {
  const logoutUrl = await getOidcLogoutUrl();
  const isMobile = await getIsMobile();
  const isAdminAuth = await api.auth.isAdminAuth();
  const isTenantAdminAuth = await api.auth.isTenantAdminAuth();
  const account = await api.account.getCurrent();
  const { isDevelopment } = checkEnvironment();

  return (
    <MainSideBarPresentation
      isMobile={isMobile}
      isAdminAuth={isAdminAuth}
      isTenantAdminAuth={isTenantAdminAuth}
      account={account}
      logoutUrl={logoutUrl}
      isDevelopment={isDevelopment}
    />
  );
};
