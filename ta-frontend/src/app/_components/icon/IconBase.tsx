import { cva } from "class-variance-authority";
import { type FC, type PropsWithChildren } from "react";

const iconVariants = cva("", {
  variants: {
    color: {
      black: "[&_path]:fill-text-title",
      white: "[&_path]:fill-bg-white",
      border: "[&_path]:fill-border-grey",
      grey: "[&_path]:fill-text-description",
      darkGrey: "[&_path]:fill-bg-darkGrey",
      blue: "[&_path]:fill-border-blue",
      red: "[&_path]:fill-bg-red",
      orange: "[&_path]:fill-bg-orange",
      yellow: "[&_path]:fill-bg-yellow",
    },
  },
  defaultVariants: {
    color: "black",
  },
});

export type IconProps = PropsWithChildren<{
  size?: number;
  color?:
    | "black"
    | "white"
    | "grey"
    | "darkGrey"
    | "border"
    | "blue"
    | "red"
    | "orange"
    | "yellow";
}>;

/**
 * アイコンの色やサイズ制御など
 */
export const IconBase: FC<IconProps> = ({ size = 16, color, children }) => {
  return (
    <svg
      className={iconVariants({ color })}
      fill={"none"}
      width={size}
      height={size}
      viewBox={"0 0 16 16"}
      xmlns={"http://www.w3.org/2000/svg"}
    >
      {children}
    </svg>
  );
};
