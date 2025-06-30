import "server-only";
import { headers } from "next/headers";

/** headerからデバイスタイプを取得し、モバイルかどうかを返す */
export const getIsMobile = async () => {
  const headersList = await headers();
  const viewport = headersList.get("x-viewport") ?? "";
  const isMobile = viewport === "mobile";
  return isMobile;
};
