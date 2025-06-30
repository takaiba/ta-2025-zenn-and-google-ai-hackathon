"use client";

import { useUser } from "@auth0/nextjs-auth0";
import { useRouter } from "next/navigation";
import { FC } from "react";

import { Button } from "../../common/Button";

export type Props = {
  logoutUrl: string;
};

/**
 * Auth0登録済みだが、メール認証が完了していない場合の画面
 */
export const NeedEmailVerification: FC<Props> = (props) => {
  const { user } = useUser();
  const router = useRouter();

  return (
    <div
      className={`bg-bg-white text-text-title flex w-full max-w-[540px] items-center justify-center rounded-lg shadow-[0_4px_8px_0_rgba(17,17,26,0.05)]`}
    >
      <div className={`flex flex-col items-center gap-8 p-8`}>
        <div className="text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="text-2xl">📧</div>
          </div>
          <h2 className={"text-center text-[24px] font-bold text-yellow-600"}>
            メール認証を完了してください
          </h2>
        </div>

        <div className="w-full space-y-6">
          {/* Email Verification Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-blue-900 mb-2">メールを確認</h3>
                <p className="text-sm text-blue-800 mb-3">
                  認証メールを送信しました。
                  <br />
                  メールボックスを確認して、認証リンクをクリックしてください。
                </p>
                <div className="bg-white border border-blue-300 rounded px-4 py-2 text-sm text-blue-700">
                  📧 送信先: {user?.email}
                </div>
              </div>
            </div>
          </div>

          {/* After Verification Instructions */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-gray-500 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 mb-2">認証後の手順</h3>
                <p className="text-sm text-gray-700">
                  メール認証を完了したら、一度ログアウトして
                  <br />
                  再度ログインしてください。
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 w-full items-center">
          <button
            onClick={() => router.push(props.logoutUrl)}
            className={`
              px-6 py-2 text-gray-700 font-medium rounded-lg border border-gray-300
              transition-all duration-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300
            `}
          >
            ログアウト
          </button>
          <p className="text-xs text-gray-500 text-center">
            メール認証完了後に再ログインが必要です
          </p>
        </div>
      </div>
    </div>
  );
};
