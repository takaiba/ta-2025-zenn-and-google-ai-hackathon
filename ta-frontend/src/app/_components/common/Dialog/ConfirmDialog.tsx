"use client";

import { Button } from "@/app/_components/common/Button";

import { Modal } from "./Modal";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
};

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "確認",
  cancelText = "キャンセル",
  variant = "danger",
  isLoading = false,
}: Props) => {
  const confirmButtonVariant = variant === "danger" ? "danger" : "filled";

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={title}
    >
      <div className={"space-y-4"}>
        <p className={"text-sm text-gray-600"}>{message}</p>
        
        <div className={"flex justify-end gap-3"}>
          <Button
            variant={"outline"}
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={confirmButtonVariant}
            onClick={onConfirm}
            disabled={isLoading}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};