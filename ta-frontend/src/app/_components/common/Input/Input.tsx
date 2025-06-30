import { type ComponentPropsWithRef, forwardRef } from "react";

export type Props = ComponentPropsWithRef<"input">;

/**
 * テキスト入力
 */
export const Input = forwardRef<HTMLInputElement, Props>(
  function Component(props, ref) {
    return (
      <input
        {...props}
        className={`border-border-grey text-text-main placeholder:text-text-description w-full appearance-none rounded-[4px] border px-[10px] py-[8px] text-[14px] ${props.className}`}
        ref={ref}
      />
    );
  },
);
