import { forwardRef } from "react";

import { CloseIcon } from "../../icon/CloseIcon";
import { SearchIcon } from "../../icon/SearchIcon";

import { useDependencies } from "./useDependencies";

export type Option = {
  label: string;
  value: string;
};

export type Props = {
  /** 選択済みの選択肢（初期値） */
  selectedOptions: Option[];
  /** 選択肢一覧 */
  options: Option[];
  onChange: (values: Option[]) => void;
  onChangeInput: (value: string) => void;
  onBlur: () => void;
  placeholder?: string;
  optionsHeight?: number;
};

/**
 * 検索・複数選択機能付きセレクトボックス
 */
export const SearchableMultiSelect = forwardRef<HTMLSelectElement, Props>(
  function Component(props, _ref) {
    const deps = useDependencies(props);

    const optionsHeightStyle = `max-h-[${props.optionsHeight || 185}px]`;

    return (
      <div className={`flex w-full flex-col items-start gap-[8px]`}>
        <div className={`relative w-full`}>
          <div className={`absolute top-[12px] right-[20px]`}>
            <SearchIcon color={"grey"} />
          </div>
          <input
            ref={deps.inputRef}
            className={`border-border-grey placeholder:text-text-description w-full appearance-none rounded-[4px] border px-[10px] py-[8px] text-[14px] outline-none`}
            autoComplete={"off"}
            placeholder={props.placeholder || "検索してください"}
            onFocus={deps.handleInputFocus}
            onBlur={deps.handleInputBlur}
            onKeyDown={deps.handleKeyDown}
            onMouseDown={deps.handleInputMouseDown}
            onChange={deps.handleChangeSearchWordInput}
          />
          {deps.isOpenOptions && (
            <ul
              className={`bg-bg-white text-text-main absolute top-[calc(100%_+_10px)] left-0 z-30 w-full overflow-hidden overflow-y-scroll rounded-[4px] text-[14px] drop-shadow-2xl ${optionsHeightStyle}`}
            >
              {props.options.map((option, index) => (
                <li
                  key={index}
                  className={`cursor-pointer px-[20px] py-[8px] ${
                    deps.activeOptionIndex === index
                      ? "bg-bg-select"
                      : "bg-bg-white"
                  } hover:bg-bg-select`}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    deps.handleOptionMouseDown(option);
                  }}
                  onMouseEnter={() => deps.handleOptionMouseEnter(index)}
                >
                  {option.label}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={`flex w-full flex-col items-start gap-[8px]`}>
          {props.selectedOptions.map((selectedOption, index) => (
            <span
              key={index}
              className={`bg-bg-grey inline-flex items-center gap-[10px] rounded-[4px] px-[8px] py-[4px] text-[12px]`}
            >
              {selectedOption.label}
              <div
                className={`cursor-pointer`}
                onClick={() => deps.handleOptionDelete(selectedOption)}
              >
                <CloseIcon size={16} color={"black"} />
              </div>
            </span>
          ))}
        </div>
      </div>
    );
  },
);
