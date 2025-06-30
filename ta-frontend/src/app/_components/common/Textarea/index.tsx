import clsx from "clsx";
import { type ComponentPropsWithRef, forwardRef } from "react";

export type Props = ComponentPropsWithRef<"textarea"> & {
  minRows?: number;
  maxRows?: number;
};

/**
 * テキストエリア
 * minRowsとmaxRowsで行数を制御できます
 */
export const Textarea = forwardRef<HTMLTextAreaElement, Props>(
  function Component({ minRows = 3, maxRows = 8, ...props }, ref) {
    return (
      <textarea
        {...props}
        ref={ref}
        className={clsx(
          "border-border-grey bg-bg-white text-text-title placeholder:text-text-description field-sizing-content w-full rounded-sm border px-3 py-2 text-sm placeholder:text-sm",
          props.className,
        )}
        style={{
          minHeight: `calc(${minRows}lh + 16px)`,
          maxHeight: `calc(${maxRows}lh + 16px)`,
        }}
      />
    );
  },
);
