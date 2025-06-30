"use client";

import { type FC } from "react";

import { type IconProps } from "../../icon/IconBase";

export type Props = {
  label: string;
  icon: FC<IconProps>;
  selected?: boolean;
  /** 縮小表示の場合はアイコンのみを表示させる */
  isSmall?: boolean;
  /** 警告マークを表示するかどうか */
  showWarning?: boolean;
  onClick?: () => void;
};

/**
 * 画面左側のメインサイドバーのボタン
 */
export const MainSideBarButtonPresentation: FC<Props> = (props) => {
  return (
    <button
      className={"group relative w-full"}
      type={"button"}
      onClick={props.onClick}
    >
      <div
        className={`group-hover:bg-bg-white/30 flex items-center gap-[8px] rounded-[8px] px-[12px] py-[8px] transition duration-100 ease-in-out ${
          props.selected ? "bg-text-title" : "bg-transparent"
        }`}
      >
        <div className={"relative"}>
          <props.icon size={16} color={"white"} />
          {props.showWarning && (
            <span
              className={
                "absolute -top-1 -right-1 size-2 rounded-full bg-red-500"
              }
            ></span>
          )}
        </div>
        {!props.isSmall && (
          <p className={`text-bg-white text-[14px] tracking-wider`}>
            {props.label}
          </p>
        )}
      </div>
    </button>
  );
};
