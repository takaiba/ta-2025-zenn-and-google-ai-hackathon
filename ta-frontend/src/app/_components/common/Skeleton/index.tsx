import { FC } from "react";

export type Props = {
  className?: string;
};

/**
 * ページ読込中のスケルトン
 */
export const Skeleton: FC<Props> = ({ className }) => {
  return (
    <div className={className || `bg-bg-select h-[8px] w-full animate-pulse rounded-full`} />
  );
};
