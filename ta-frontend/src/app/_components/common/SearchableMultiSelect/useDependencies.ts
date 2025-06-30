import _ from "lodash";
import { ChangeEvent, useRef, useState } from "react";

import { useWindowSize } from "@/app/_hooks/useWindowSIze";

import { Option, type Props } from "./SearchableMultiSelect";

export const useDependencies = (props: Props) => {
  const { isMobile } = useWindowSize();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpenOptions, setIsOpenOptions] = useState(false);
  const [activeOptionIndex, setActiveOptionIndex] = useState(0);
  const [searchWord, setSearchWord] = useState("");

  const toggleOptionsOpen = (isOpen: boolean) => {
    setIsOpenOptions(isOpen);
  };

  /** 入力欄をフォーカスすると選択肢が開く */
  const handleInputFocus = () => {
    setIsOpenOptions(true);
  };

  /** 入力欄からフォーカスが外れると選択肢が閉じる */
  const handleInputBlur = () => {
    setIsOpenOptions(false);
  };

  /** propsのonChangeに変更後の選択を入れる */
  const handleOptionMouseDown = (option: Option) => {
    const selectedOptions = props.selectedOptions;
    const newSelectedOptions = selectedOptions.some(
      (selectedOption) => selectedOption.value === option.value,
    )
      ? selectedOptions.filter(
          (selectedOption) => selectedOption.value !== option.value,
        )
      : [...selectedOptions, option];
    props.onChange(newSelectedOptions);
    setIsOpenOptions(false);
  };

  /** 入力欄をクリックすると選択肢が開く */
  const handleInputMouseDown = () => {
    setIsOpenOptions(true);
  };

  /** 選択すると選択肢が閉じる */
  const handleOptionDelete = (option: Option) => {
    const newSelectedOptions = props.selectedOptions.filter(
      (selectedOption) => selectedOption !== option,
    );
    props.onChange(newSelectedOptions);
  };

  /** 選択肢にマウスが乗るとカーソルを移動させる */
  const handleOptionMouseEnter = (index: number) => {
    setActiveOptionIndex(index);
  };

  /** 各キーボード操作 */
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      setActiveOptionIndex((prev) => {
        if (prev === props.options.length - 1) return 0;
        return prev + 1;
      });
    }
    if (event.key === "ArrowUp") {
      setActiveOptionIndex((prev) => {
        if (prev === 0) return props.options.length - 1;
        return prev - 1;
      });
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (isOpenOptions) {
        const selectedOption = props.options[activeOptionIndex];
        if (!selectedOption) return;
        handleOptionMouseDown(selectedOption);
      } else {
        setIsOpenOptions(true);
      }
    }
  };

  /** 検索文字列の確定（debounceで確定する文字列を絞ってある） */
  const handleChangeSearchWordInput = _.debounce(
    (event: ChangeEvent<HTMLInputElement>) => {
      setIsOpenOptions(true);
      setSearchWord(event.target.value);
      props.onChangeInput(event.target.value);
    },
    500,
  );

  return {
    isOpenOptions,
    isMobile,
    activeOptionIndex,
    setActiveOptionIndex,
    toggleOptionsOpen,
    handleKeyDown,
    inputRef,
    handleChangeSearchWordInput,
    searchWord,
    handleInputFocus,
    handleInputBlur,
    handleOptionMouseDown,
    handleOptionMouseEnter,
    handleOptionDelete,
    handleInputMouseDown,
  };
};
