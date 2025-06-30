import { FC, PropsWithChildren } from "react";

import { MainSideBar } from "../MainSideBar";

import { useDependencies } from "./useDependencies";

export type Props = PropsWithChildren;

/**
 * 全ページ共通処理やレイアウトを提供するコンポーネント
 */
export const Layout: FC<Props> = (props) => {
  const _ = useDependencies(props);

  return (
    <div
      className={`bg-bg-grey flex h-dvh w-screen flex-row items-start`}
    >
      <MainSideBar />
      <div className={`flex size-full min-w-0 flex-1 flex-col overflow-auto`}>
        {props.children}
      </div>
    </div>
  );
};
