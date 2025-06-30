import { type ComponentProps, type FC, type PropsWithChildren } from "react";

export type Props = ComponentProps<"button"> &
  PropsWithChildren<{
    padding?: number;
    outline?: boolean;
    noHover?: boolean;
  }>;

/**
 * アイコンのボタン化
 */
export const IconButton: FC<Props> = (props) => {
  const { padding, outline, noHover, ...restProps } = props;

  return (
    <button
      {...restProps}
      type={"button"}
      className={`border-border-grey flex items-center justify-center rounded-[4px] ${
        outline ? "border" : ""
      } ${!noHover ? "hover:bg-bg-select" : ""}`}
      style={{
        padding: padding !== undefined ? `${padding}px` : "4px",
      }}
    >
      {props.children}
    </button>
  );
};
