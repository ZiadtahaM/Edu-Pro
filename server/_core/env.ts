export const ENV = {
  appId: process.env.VITE_APP_ID || "edu-pro-app",
  cookieSecret: process.env.JWT_SECRET || "edu-pro-default-dev-jwt-secret-key-32-chars-minimum",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "dev-admin-user",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};
