"use client";

import { Prisma } from "@prisma/client";
import { useRouter } from "next/navigation";
import { FC, useState } from "react";

import { Button } from "@/app/_components/common/Button";
import { Modal } from "@/app/_components/common/Dialog";

type Props = {
  triggerElement?: JSX.Element;
  account: Prisma.AccountGetPayload<{
    include: {
      organization: true;
    };
  }> | null;
  logoutUrl: string;
};

export const AccountModalPresentation: FC<Props> = (props) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [copyButtonText, setCopyButtonText] = useState("コピー");

  const handleCopyOrganizationId = () => {
    if (props.account?.organization.id) {
      void navigator.clipboard.writeText(props.account.organization.id).then(() => {
        setCopyButtonText("コピーしました");
        setTimeout(() => setCopyButtonText("コピー"), 2000);
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      triggerElement={props.triggerElement}
      title={"アカウント"}
    >
      <div className={"text-text-title flex w-full flex-col gap-4 text-sm"}>
        <div className={`flex gap-4`}>
          <p className={"w-[150px] shrink-0"}>メールアドレス</p>
          <p className={"w-full font-bold"}>{props.account?.email}</p>
        </div>
        <div className={`flex gap-4`}>
          <p className={"w-[150px] shrink-0"}>所属組織</p>
          <p className={"w-full font-bold"}>{props.account?.organization.name}</p>
        </div>
        <div className={`flex gap-4`}>
          <p className={"w-[150px] shrink-0"}>ロール</p>
          <p className={"w-full font-bold"}>{props.account?.role}</p>
        </div>
        <div className={`mt-4 flex w-full items-center justify-between`}>
          <div
            className={
              "flex cursor-pointer items-center gap-1 text-xs text-gray-500"
            }
            onClick={handleCopyOrganizationId}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                handleCopyOrganizationId();
              }
            }}
            role={"button"}
            tabIndex={0}
          >
            <span>組織ID: {props.account?.organization.id}</span>
            <button
              type={"button"}
              onClick={(e) => {
                e.stopPropagation();
                handleCopyOrganizationId();
              }}
              className={
                "ml-1 rounded bg-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-300 disabled:opacity-50"
              }
              disabled={copyButtonText === "コピーしました"}
              aria-label={"組織IDをコピー"}
            >
              {copyButtonText}
            </button>
          </div>
          <Button onClick={() => router.push(props.logoutUrl)}>
            ログアウト
          </Button>
        </div>
      </div>
    </Modal>
  );
};
