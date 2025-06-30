import { cva, type VariantProps } from "class-variance-authority";
import clsx from "clsx";
import * as React from "react";
import { OneEightyRingWithBg } from "react-svg-spinners";

const buttonVariants = cva(
  "rounded-lg font-bold leading-none transition duration-100 ease-in-out focus-visible:outline-2 disabled:opacity-50",
  {
    variants: {
      variant: {
        filled: "bg-bg-darkGrey text-bg-white hover:bg-bg-darkGrey/80",
        outline:
          "border border-text-main bg-bg-white text-text-main hover:bg-bg-select/80",
        danger: "bg-red-600 text-white hover:bg-red-700",
      },
      size: {
        sm: "px-[12px] py-[8px] text-[10px] tracking-wide",
        md: "px-[16px] py-[10px] text-[12px] tracking-wider",
        lg: "px-[20px] py-[12px] text-[14px] tracking-widest",
        "sm-icon": "size-fit p-[4px]",
        "md-icon": "size-fit p-[6px]",
        "lg-icon": "size-fit p-[8px]",
      },
    },
    defaultVariants: {
      variant: "filled",
      size: "md",
    },
  },
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  disableLoadingIcon?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { children, variant, size, isLoading, disableLoadingIcon, ...props },
    ref,
  ) => (
    <button
      className={clsx(buttonVariants({ variant, size }))}
      ref={ref}
      disabled={isLoading}
      {...props}
    >
      <div className={"flex items-center gap-2"}>
        {isLoading && !disableLoadingIcon && (
          <OneEightyRingWithBg width={12} height={12} color={"white"} />
        )}
        {children}
      </div>
    </button>
  ),
);
Button.displayName = "Button";
