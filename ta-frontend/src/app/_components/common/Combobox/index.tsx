"use client";

import { Popover as BasePopover } from "@base-ui-components/react/popover";
import clsx from "clsx";
import { Command as BaseCommand } from "cmdk-base";
import * as React from "react";
import { FC, useId, useState } from "react";

import { ArrowDownIcon } from "../../icon/ArrowDownIcon";
import { CheckIcon } from "../../icon/CheckIcon";
import { SearchIcon } from "../../icon/SearchIcon";

export type Props = {
  initialValue?: string;
  options: {
    value: string;
    label: string;
  }[];
  onChange: (value: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
};

/**
 * コンボボックス
 */
export const Combobox: FC<Props> = (props) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<string | null>(props.initialValue ?? null);
  const uniqueId = useId();
  const listboxId = `listbox-${uniqueId}`;

  return (
    <BasePopover.Root open={open} onOpenChange={setOpen}>
      <BasePopover.Trigger
        render={(popoverProps) => (
          <button
            {...popoverProps}
            role={"combobox"}
            aria-expanded={open}
            aria-controls={listboxId}
            className={
              "bg-bg-white border-border-grey text-text-title flex w-full items-center justify-between rounded-md border px-2.5 py-2 text-sm"
            }
          >
            {props.options.find((item) => item.value === value)?.label}
            <ArrowDownIcon />
          </button>
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
                      onSelect={(currentValue) => {
                        setValue(currentValue);
                        setOpen(false);
                      }}
                      className={
                        "data-[selected=true]:bg-bg-select relative flex w-full cursor-pointer items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
                      }
                      role={"option"}
                    >
                      {item.label}
                      {value === item.value && <CheckIcon />}
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
