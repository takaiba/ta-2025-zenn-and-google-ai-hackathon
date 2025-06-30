"use client";

import { Popover as BasePopover } from "@base-ui-components/react/popover";
import clsx from "clsx";
import { Command as BaseCommand } from "cmdk-base";
import * as React from "react";
import { FC, useId, useState } from "react";

import { ArrowDownIcon } from "../../icon/ArrowDownIcon";
import { CheckIcon } from "../../icon/CheckIcon";
import { CloseIcon } from "../../icon/CloseIcon";
import { SearchIcon } from "../../icon/SearchIcon";

export type Props = {
  initialValue?: string[];
  options: {
    value: string;
    label: string;
  }[];
  onChange: (value: string[]) => void;
  onBlur?: () => void;
  onFocus?: () => void;
};

/**
 * 複数選択機能付きコンボボックス
 */
export const MultiCombobox: FC<Props> = (props) => {
  const [open, setOpen] = useState(false);
  const [selectedValues, setSelectedValues] = useState<string[]>(
    props.initialValue ?? [],
  );
  // アクセシビリティ対応のためにIDを生成
  const uniqueId = useId();
  const listboxId = `listbox-${uniqueId}`;

  const handleSelect = (currentValue: string) => {
    const newSelectedValues = selectedValues.includes(currentValue)
      ? selectedValues.filter((val) => val !== currentValue)
      : [...selectedValues, currentValue];

    setSelectedValues(newSelectedValues);
    props.onChange(newSelectedValues);
  };

  const handleRemove = (value: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const newSelectedValues = selectedValues.filter((val) => val !== value);
    setSelectedValues(newSelectedValues);
    props.onChange(newSelectedValues);
  };

  return (
    <BasePopover.Root open={open} onOpenChange={setOpen}>
      <BasePopover.Trigger
        render={(popoverProps) => (
          <div
            {...popoverProps}
            className={
              "bg-bg-white border-border-grey text-text-title flex w-full cursor-pointer items-center justify-between rounded-md border px-2.5 py-2 text-sm"
            }
            role={"combobox"}
            aria-expanded={open}
            aria-controls={listboxId}
            tabIndex={0}
            onBlur={props.onBlur}
            onFocus={props.onFocus}
          >
            <div
              className={
                "flex max-h-[120px] max-w-[calc(100%-20px)] flex-wrap gap-1 overflow-y-auto"
              }
            >
              {selectedValues.length === 0 ? (
                <span className={"text-text-description"}>
                  選択してください
                </span>
              ) : (
                selectedValues.map((value) => {
                  const item = props.options.find(
                    (item) => item.value === value,
                  );
                  return item ? (
                    <div
                      key={value}
                      className={
                        "bg-bg-select flex items-center gap-1 rounded px-2 py-0.5"
                      }
                    >
                      <span>{item.label}</span>
                      <div
                        role={"button"}
                        tabIndex={0}
                        onClick={(e) => handleRemove(value, e)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleRemove(
                              value,
                              e as unknown as React.MouseEvent,
                            );
                          }
                        }}
                        className={"flex cursor-pointer items-center"}
                        aria-label={`${item.label}を削除`}
                      >
                        <CloseIcon size={12} />
                      </div>
                    </div>
                  ) : null;
                })
              )}
            </div>
            <ArrowDownIcon />
          </div>
        )}
      />
      <BasePopover.Portal>
        <BasePopover.Positioner sideOffset={4} align={"start"}>
          <BasePopover.Popup
            className={clsx(
              "bg-bg-white text-popover-foreground outline-border border-border-grey origin-[var(--transform-origin)] rounded-md border shadow-[0_4px_8px_0_rgba(17,17,26,0.05)] -outline-offset-1 transition-[transform,scale,opacity] data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 dark:shadow-none",
              "w-[var(--anchor-width)] p-0",
            )}
          >
            <BaseCommand
              id={listboxId}
              role={"listbox"}
              className={
                "bg-bg-white text-popover-foreground flex size-full flex-col overflow-hidden rounded-lg outline-none"
              }
            >
              <div
                className={
                  "border-border-grey flex items-center gap-1 border-b px-3"
                }
                cmdk-input-wrapper={""}
              >
                <SearchIcon />
                <BaseCommand.Input
                  placeholder={"検索"}
                  className={
                    "placeholder:text-text-description flex h-10 w-full border-none bg-transparent py-3 text-sm outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
                  }
                />
              </div>
              <BaseCommand.List
                className={"max-h-[300px] overflow-x-hidden overflow-y-auto"}
              >
                <BaseCommand.Empty className={"py-6 text-center text-sm"}>
                  見つかりません
                </BaseCommand.Empty>
                <BaseCommand.Group
                  className={
                    "text-foreground [&_[cmdk-group-heading]]:text-muted-foreground overflow-hidden p-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium"
                  }
                >
                  {props.options.map((item) => (
                    <BaseCommand.Item
                      key={item.value}
                      value={item.value}
                      onSelect={handleSelect}
                      className={
                        "data-[selected=true]:bg-bg-select relative flex w-full cursor-pointer items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
                      }
                      role={"option"}
                    >
                      {item.label}
                      {selectedValues.includes(item.value) && <CheckIcon />}
                    </BaseCommand.Item>
                  ))}
                </BaseCommand.Group>
              </BaseCommand.List>
            </BaseCommand>
          </BasePopover.Popup>
        </BasePopover.Positioner>
      </BasePopover.Portal>
    </BasePopover.Root>
  );
};
