"use client";

import { Dialog as DialogPrimitive } from "@base-ui-components/react/dialog";
import React, { FC, PropsWithChildren } from "react";

import { CloseIcon } from "../../icon/CloseIcon";

type Props = PropsWithChildren<{
  triggerElement?: JSX.Element;
  title: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}>;

export const Modal: FC<Props> = (props) => {
  return (
    <DialogPrimitive.Root open={props.isOpen} onOpenChange={props.onOpenChange}>
      {props.triggerElement && (
        <DialogPrimitive.Trigger render={props.triggerElement} />
      )}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className={
            "bg-bg-black fixed inset-0 opacity-20 transition-all duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 dark:opacity-70"
          }
        />
        <DialogPrimitive.Popup
          className={
            "bg-bg-white text-text-title outline-border-grey fixed top-1/2 left-1/2 flex max-h-[90vh] w-full max-w-[680px] -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg outline-1 transition-all duration-150 data-[ending-style]:scale-90 data-[ending-style]:opacity-0 data-[starting-style]:scale-90 data-[starting-style]:opacity-0"
          }
        >
          <DialogPrimitive.Close
            className={
              "absolute top-4 right-4 flex items-center justify-center rounded-sm focus-visible:outline-2"
            }
          >
            <CloseIcon />
          </DialogPrimitive.Close>
          <DialogPrimitive.Title
            className={
              "border-border-grey text-text-title border-b px-6 py-4 text-sm font-bold"
            }
          >
            {props.title}
          </DialogPrimitive.Title>
          <div className={"overflow-y-auto px-6 py-4"}>{props.children}</div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};