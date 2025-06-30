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

export const FullScreenModal: FC<Props> = (props) => {
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
            "bg-bg-white text-text-title outline-border-grey fixed inset-4 flex flex-col rounded-lg outline-1 transition-all duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0"
          }
        >
          <DialogPrimitive.Close
            className={
              "absolute top-4 right-4 z-10 flex items-center justify-center rounded-sm focus-visible:outline-2"
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
          <div className={"flex-1 overflow-hidden px-6 py-4"}>
            {props.children}
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
