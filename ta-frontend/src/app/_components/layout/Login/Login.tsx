"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FC, useEffect, useState } from "react";

import { Button } from "../../common/Button";

export type Props = Record<string, never>;

/**
 * ログイン画面
 */
export const Login: FC<Props> = (_) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const action = searchParams.get("action");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    // クエリパラメータに応じた処理を行う
    if (action === "complete") {
      setMessage("メール認証が完了しました。ログインしてください。");
    }
  }, [action, router, pathname, searchParams]);

  return (
    <div className={`flex size-full max-w-[600px] items-center justify-center`}>
      <div className={`flex flex-col items-center gap-12 p-8`}>
        <p className={"text-text-main text-5xl font-bold tracking-widest"}>
          QA³
        </p>
        {message && (
          <div className={"bg-bg-select flex flex-col rounded-lg p-5"}>
            <p className={"text-text-title text-sm font-bold"}>{message}</p>
          </div>
        )}
        <div className={"flex items-center gap-4"}>
          <Button onClick={() => router.push("/auth/login")}>ログイン</Button>
          <Button onClick={() => router.push("/auth/login?screen_hint=signup")}>
            新規登録
          </Button>
        </div>
      </div>
    </div>
  );
};
