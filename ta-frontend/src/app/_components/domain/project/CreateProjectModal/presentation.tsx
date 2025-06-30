"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/app/_components/common/Button";
import { Modal } from "@/app/_components/common/Dialog";
import { Input } from "@/app/_components/common/Input/Input";
import { InputElementContainer } from "@/app/_components/common/InputElementContainer/InputElementContainer";

import { createProjectSchema, type CreateProjectInput } from "./schema";

type Props = {
  onSubmit: (data: CreateProjectInput) => void;
  onClose: () => void;
  isLoading: boolean;
};

export const Presentation = ({ onSubmit, onClose, isLoading }: Props) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: "",
      description: "",
      url: "",
    },
  });

  return (
    <Modal
      isOpen={true}
      onOpenChange={(open) => !open && onClose()}
      title={"新規プロジェクト作成"}
    >
      <form onSubmit={handleSubmit(onSubmit)} className={"space-y-4"}>
        <InputElementContainer
          label={"プロジェクト名"}
          required
          errorMessage={errors.name?.message}
        >
          <Input
            id={"name"}
            type={"text"}
            {...register("name")}
            placeholder={"例: ECサイト本番環境"}
          />
        </InputElementContainer>

        <InputElementContainer
          label={"テスト対象URL"}
          required
          errorMessage={errors.url?.message}
          description={"自動テストを実行するWebサイトのURLを入力してください"}
        >
          <Input
            id={"url"}
            type={"url"}
            {...register("url")}
            placeholder={"https://example.com"}
          />
        </InputElementContainer>

        <InputElementContainer
          label={"説明"}
          errorMessage={errors.description?.message}
        >
          <textarea
            id={"description"}
            {...register("description")}
            placeholder={"プロジェクトの概要や目的を記入してください"}
            rows={3}
            className={"border-border-grey bg-bg-white text-text-title placeholder:text-text-description field-sizing-content w-full rounded-sm border px-3 py-2 text-sm placeholder:text-sm"}
            style={{
              minHeight: "calc(3lh + 16px)",
              maxHeight: "calc(8lh + 16px)",
            }}
          />
        </InputElementContainer>

        <div className={"mt-6 flex justify-end space-x-3"}>
          <Button
            type={"button"}
            variant={"outline"}
            onClick={onClose}
            disabled={isLoading}
          >
            キャンセル
          </Button>
          <Button
            type={"submit"}
            disabled={isLoading}
            isLoading={isLoading}
          >
            作成する
          </Button>
        </div>
      </form>
    </Modal>
  );
};