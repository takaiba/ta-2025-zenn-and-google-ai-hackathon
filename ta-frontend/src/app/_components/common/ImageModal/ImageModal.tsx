"use client";

import { Dialog as DialogPrimitive } from "@base-ui-components/react/dialog";
import React, { FC } from "react";

import { createImageDataUrl, isValidImageData, inferMimeType } from "@/utils/imageUtils";

import { CloseIcon } from "../../icon/CloseIcon";

type Props = {
  src: string;
  alt: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export const ImageModal: FC<Props> = ({ src, alt, isOpen, onOpenChange }) => {
  // Base64データを正しいData URL形式に変換
  const imageSrc = isValidImageData(src) 
    ? createImageDataUrl(src, inferMimeType(src))
    : src;

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className={
            "bg-black/80 fixed inset-0 z-50 transition-all duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0"
          }
        />
        <DialogPrimitive.Popup
          className={
            "fixed inset-4 z-50 flex items-center justify-center transition-all duration-150 data-[ending-style]:scale-90 data-[ending-style]:opacity-0 data-[starting-style]:scale-90 data-[starting-style]:opacity-0"
          }
        >
          <DialogPrimitive.Close
            className={
              "absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-white hover:bg-black/40 focus-visible:outline-2 focus-visible:outline-white"
            }
          >
            <CloseIcon />
          </DialogPrimitive.Close>
          <img
            src={imageSrc}
            alt={alt}
            className={
              "max-h-full max-w-full object-contain rounded-lg shadow-2xl"
            }
            onError={(e) => {
              console.warn("Failed to load image in modal:", src);
            }}
          />
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};