"use client";

import clsx from "clsx";
import { FC, PropsWithChildren } from "react";

export type Props = PropsWithChildren<{
  isMobile: boolean;
}>;

/**
 * ヘッダー
 */
export const HeaderPresentation: FC<Props> = (props) => {
  return (
    // SPの場合はメニューアイコン分のpaddingを追加する
    <div
      className={clsx(
        "bg-bg-white flex h-[60px] w-full shrink-0 flex-row items-center shadow-[0_4px_8px_0_rgba(17,17,26,0.05)]",
        props.isMobile ? "pr-[20px] pl-[60px]" : "px-[20px]",
      )}
    >
      {props.children}
    </div>
  );
};
