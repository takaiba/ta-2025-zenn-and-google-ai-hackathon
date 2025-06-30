"use client";

import { useRouter } from "next/navigation";
import { FC, useState } from "react";
import { toast } from "sonner";

import { api } from "@/trpc/react";
import { Button } from "../../common/Button";

export type Props = {
  logoutUrl: string;
};

/**
 * Auth0登録、メール認証済みだが、アプリケーション側で許可されていない場合の画面
 */
export const NotAllowed: FC<Props> = (props) => {
  const router = useRouter();
  const [isRegistering, setIsRegistering] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);

  const registerMutation = api.account.registerDemo.useMutation({
    onSuccess: () => {
      setIsRegistering(false);
      setIsRegistered(true);
      toast.success("アカウントが正常に登録されました！");
    },
    onError: (error) => {
      setIsRegistering(false);
      toast.error(error.message || "アカウントの登録に失敗しました");
    }
  });

  const handleStartDemo = () => {
    setIsRegistering(true);
    registerMutation.mutate();
  };

  if (isRegistered) {
    return (
      <div
        className={`bg-bg-white text-text-title flex w-full max-w-[540px] items-center justify-center rounded-lg shadow-[0_4px_8px_0_rgba(17,17,26,0.05)]`}
      >
        <div className={`flex flex-col items-center gap-8 p-8`}>
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="text-2xl">✅</div>
            </div>
            <h2 className={"text-center text-[24px] font-bold text-green-600"}>
              アカウント登録完了！
            </h2>
          </div>
          
          <div className="text-center space-y-4">
            <p className={"text-sm"}>
              QA³のアカウント登録が完了しました。
            </p>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <p className={"text-sm text-yellow-800"}>
                <strong>⚠️ 重要:</strong> 
                <br />
                サービスを開始するには、一度ログアウトしてから
                <br />
                再度ログインしてください。
              </p>
            </div>
          </div>
          
          <div className="flex flex-col gap-4 w-full items-center">
            <button
              onClick={() => router.push(props.logoutUrl)}
              className={`
                w-full max-w-xs px-8 py-4 text-white font-bold text-lg rounded-lg shadow-lg
                transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-300
                bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700
              `}
            >
              🔄 ログアウトして再ログイン
            </button>
            <p className="text-xs text-gray-500 text-center">
              ログアウト後、再度ログインページからログインしてください
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-bg-white text-text-title flex w-full max-w-[540px] items-center justify-center rounded-lg shadow-[0_4px_8px_0_rgba(17,17,26,0.05)]`}
    >
      <div className={`flex flex-col items-center gap-8 p-8`}>
        <h2 className={"text-center text-[24px] font-bold"}>
          QA³へようこそ！
        </h2>
        <div className="text-center space-y-3">
          <p className={"text-sm"}>
            🎉 <strong>Google Cloud AIハッカソン</strong>開催中！
          </p>
          <p className={"text-sm"}>
            期間限定で<strong className="text-blue-600">無制限</strong>にご利用いただけます。
            <br />
            下記ボタンをクリックして今すぐ始めましょう！
          </p>
        </div>
        <div className="flex flex-col gap-6 w-full items-center">
          <button
            onClick={handleStartDemo}
            disabled={isRegistering}
            className={`
              w-full max-w-xs px-8 py-4 text-white font-bold text-lg rounded-lg shadow-lg
              transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300
              ${isRegistering 
                ? "bg-gray-400 cursor-not-allowed" 
                : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              }
            `}
          >
            {isRegistering ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                登録中...
              </div>
            ) : (
              "🚀 利用開始"
            )}
          </button>
          <button
            className={"text-sm underline text-gray-500 hover:text-gray-700 transition-colors"}
            onClick={() => router.push(props.logoutUrl)}
          >
            ログアウト
          </button>
        </div>
      </div>
    </div>
  );
};
