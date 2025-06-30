"use client";

import { Prisma } from "@prisma/client";
import clsx from "clsx";
import { usePathname, useRouter } from "next/navigation";
import { useState, type FC } from "react";

import { IconButton } from "../../common/IconButton";
import { AccountModal } from "../../domain/account/AccountModal";
import { BuildingIcon } from "../../icon/BuildingIcon";
import { ChatIcon } from "../../icon/ChatIcon";
import { CloseIcon } from "../../icon/CloseIcon";
import { KnowledgeIcon } from "../../icon/KnowledgeIcon";
import { MenuIcon } from "../../icon/MenuIcon";
import { QuestionIcon } from "../../icon/QuestionIcon";
import { SettingIcon } from "../../icon/SettingIcon";
import { SideBarCloseFilledIcon } from "../../icon/SideBarCloseFilledIcon";
import { SideBarOpenFilledIcon } from "../../icon/SideBarOpenFilledIcon";
import { UserIcon } from "../../icon/UserIcon";
import { MainSideBarButton } from "../MainSideBarButton";

export type Props = {
  isMobile: boolean;
  isAdminAuth: boolean;
  isTenantAdminAuth: boolean;
  account: Prisma.AccountGetPayload<{
    include: {
      organization: true;
    };
  }> | null;
  logoutUrl: string;
  isDevelopment: boolean;
};

/**
 * 画面左側のメインサイドバー
 */
export const MainSideBarPresentation: FC<Props> = (props) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpenMainSideBar, setIsOpenMainSideBar] = useState(true);
  const [isOpenMobileMainSideBar, setIsOpenMobileMainSideBar] = useState(false);
  const [isOpenMainSideBarDelayed, setIsOpenMainSideBarDelayed] =
    useState(true);

  const openMainSideBar = () => {
    setIsOpenMainSideBar(true);
    // 一部のボタンはwidthが狭い時に文字を表示してしまうと表示が崩れるため、widthが完全に開いた後（100ms後）に表示されるよう遅延させる
    setTimeout(() => {
      setIsOpenMainSideBarDelayed(true);
    }, 100);
  };

  const closeMainSideBar = () => {
    setIsOpenMainSideBar(false);
    setIsOpenMainSideBarDelayed(false);
  };

  const openMobileMainSideBar = () => {
    setIsOpenMobileMainSideBar(true);
  };

  const closeMobileMainSideBar = () => {
    setIsOpenMobileMainSideBar(false);
  };

  return (
    <>
      {props.isMobile ? (
        <>
          <div className={`fixed top-4 left-4 z-10`}>
            <IconButton noHover onClick={openMobileMainSideBar}>
              <MenuIcon size={20} />
            </IconButton>
          </div>
          <div
            className={`fixed top-0 left-0 z-20 flex h-dvh w-screen flex-col transition-transform duration-200 ease-in-out ${
              isOpenMobileMainSideBar ? "translate-x-0" : "translate-x-[-100vw]"
            }`}
          >
            <div
              className={`bg-bg-darkGrey absolute top-0 left-0 z-20 flex h-dvh w-[90vw] flex-col p-5 shadow-[0_0_16px_0px_rgba(17,17,26,0.1)]`}
            >
              <div className={`flex h-15 w-full shrink-0 flex-col items-end`}>
                <IconButton noHover onClick={closeMobileMainSideBar}>
                  <CloseIcon color={"white"} />
                </IconButton>
              </div>
              <div className={`flex grow flex-col gap-8`}>
                {/* TODO: モバイル対応の際に編集する */}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div
          className={`bg-bg-darkGrey flex h-full shrink-0 flex-col transition-all duration-100 ${
            isOpenMainSideBar ? "w-[256px]" : "w-[80px]"
          }`}
        >
          <div
            className={
              "border-text-title flex h-[60px] w-full shrink-0 items-center border-b px-5"
            }
          >
            {isOpenMainSideBar ? (
              <button
                className={
                  "text-bg-white bg-bg-blue hover:bg-bg-blue/80 flex w-full items-center justify-center rounded-full px-4 py-2 text-sm font-bold transition-all duration-150"
                }
                onClick={() => {
                  router.push("/");
                }}
              >
                QA³
              </button>
            ) : (
              <button
                className={
                  "text-bg-white bg-bg-blue hover:bg-bg-blue/80 flex size-10 w-full items-center justify-center rounded-full font-bold transition-all duration-150"
                }
                onClick={() => {
                  router.push("/");
                }}
              >
                <ChatIcon color={"white"} />
              </button>
            )}
          </div>
          <div className={"flex min-h-0 flex-1 flex-col"}>
            <div
              className={`flex min-h-0 w-full flex-1 flex-col gap-2 p-5 ${
                !isOpenMainSideBar && "items-center"
              }`}
            >
              <MainSideBarButton
                label={"プロジェクト"}
                icon={BuildingIcon}
                selected={pathname.startsWith("/projects")}
                isSmall={!isOpenMainSideBarDelayed}
                onClick={() => {
                  router.push("/projects");
                }}
              />
              <MainSideBarButton
                label={"バグチケット"}
                icon={QuestionIcon}
                selected={pathname === "/bugs"}
                isSmall={!isOpenMainSideBarDelayed}
                onClick={() => {
                  router.push("/bugs");
                }}
              />
              <MainSideBarButton
                label={"テストレポート"}
                icon={KnowledgeIcon}
                selected={pathname === "/reports"}
                isSmall={!isOpenMainSideBarDelayed}
                onClick={() => {
                  router.push("/reports");
                }}
              />
            </div>
            <div
              className={`flex h-[300px] w-full shrink-0 flex-col justify-end gap-2 p-5 pb-0 ${
                !isOpenMainSideBar && "items-center"
              }`}
            >
              <AccountModal
                account={props.account}
                logoutUrl={props.logoutUrl}
                triggerElement={
                  <MainSideBarButton
                    label={"アカウント"}
                    icon={UserIcon}
                    isSmall={!isOpenMainSideBarDelayed}
                  />
                }
              />
            </div>
          </div>
          <div
            className={clsx([
              "flex h-10 w-full shrink-0 px-5",
              isOpenMainSideBar ? "justify-end" : "justify-center",
            ])}
          >
            <IconButton
              onClick={isOpenMainSideBar ? closeMainSideBar : openMainSideBar}
              noHover
            >
              {isOpenMainSideBar ? (
                <SideBarCloseFilledIcon color={"white"} />
              ) : (
                <SideBarOpenFilledIcon color={"white"} />
              )}
            </IconButton>
          </div>
        </div>
      )}
    </>
  );
};
