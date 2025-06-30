import { useState, type FC, type PropsWithChildren } from "react";

import { HelpIcon } from "../../icon/HelpIcon";

export type Props = PropsWithChildren<{
  label?: string;
  description?: string;
  detailText?: string;
  errorMessage?: string;
  /** 必須マークの付与 */
  required?: boolean;
  isSmallText?: boolean;
  /** ラベルの横に表示する要素 */
  labelSideElement?: React.ReactNode;
  /** 要素を非表示にする */
  hidden?: boolean;
}>;

/**
 * Inputなどの入力要素を囲むことでラベルや説明、エラーメッセージ表示機能を付与する
 */
export const InputElementContainer: FC<Props> = (props) => {
  const [isOpenDetail, setIsOpenDetail] = useState(false);

  return (
    <div
      className={`flex w-full flex-col gap-[4px] ${props.hidden ? "hidden" : ""}`}
    >
      <div className={`flex flex-row items-center gap-[8px]`}>
        {!!props.label && (
          <p
            className={`${
              props.isSmallText ? "text-[12px]" : "text-[14px]"
            } text-text-title font-bold`}
          >
            {props.label}
            {!!props.required && <span className={`text-text-alert`}> *</span>}
          </p>
        )}
        {props.labelSideElement}
        {!!props.detailText && (
          <div
            className={`cursor-pointer`}
            onClick={() => setIsOpenDetail((prev) => !prev)}
          >
            <HelpIcon size={14} />
          </div>
        )}
      </div>
      {!!props.description && (
        <p
          className={`${
            props.isSmallText ? "text-[10px]" : "text-[12px]"
          } text-text-description whitespace-break-spaces`}
        >
          {props.description}
        </p>
      )}
      {isOpenDetail && (
        <div className={`bg-bg-grey rounded-[8px] p-[14px]`}>
          <p
            className={`whitespace-pre-wrap ${
              props.isSmallText ? "text-[10px]" : "text-[12px]"
            } text-text-description`}
          >
            {props.detailText}
          </p>
        </div>
      )}
      {props.children}
      {!!props.errorMessage && (
        <p
          className={`${props.isSmallText ? "text-[12px]" : "text-[14px]"} text-text-alert`}
        >
          {props.errorMessage}
        </p>
      )}
    </div>
  );
};
