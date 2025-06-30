"use client";

import Link from "next/link";
import { FC } from "react";

import { IconProps } from "../../icon/IconBase";

export type Props = {
  href?: string;
  blank?: boolean;
  label: string;
  icon: FC<IconProps>;
  /** 警告マークを表示するかどうか */
  showWarning?: boolean;
  onClick?: () => void;
};

/**
 * モバイル用メインサイドバーに表示する遷移ボタン
 */
export const MobileMainSideBarButtonPresentation: FC<Props> = (props) => {
  return (
    <Link href={props.href || ""} target={props.blank ? "_blank" : ""}>
      <button
        className={`flex flex-row items-center gap-[16px]`}
        onClick={props.onClick}
      >
        <div className={"relative"}>
          <props.icon color={"white"} />
          {props.showWarning && (
            <span
              className={
                "absolute -top-1 -right-1 size-2 rounded-full bg-red-500"
              }
            ></span>
          )}
        </div>
        <p className={`text-bg-white text-[16px] font-bold`}>{props.label}</p>
      </button>
    </Link>
  );
};
