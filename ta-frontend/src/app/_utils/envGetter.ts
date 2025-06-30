import "server-only";

export const getTenantPrefix = () => {
  const tenantPrefix = process.env.TENANT_PREFIX;
  if (!tenantPrefix) {
    throw new Error("TENANT_PREFIXが設定されていません");
  }

  return tenantPrefix;
};

export const checkEnvironment = () => {
  const tenantPrefix = getTenantPrefix();
  return {
    isProduction: tenantPrefix === "ta",
    isStaging: tenantPrefix === "stg-ta",
    isDevelopment: tenantPrefix === "dev-ta",
  };
};
