import { Select as BaseSelect } from "@base-ui-components/react";
import { ComponentPropsWithRef, FC } from "react";

import { ArrowDownIcon } from "../../icon/ArrowDownIcon";
import { CheckIcon } from "../../icon/CheckIcon";

type Props = ComponentPropsWithRef<"select"> & {
  options: Array<{
    label: string;
    value: string;
  }>;
};

/**
 * セレクトボックス
 */
export const Select: FC<Props> = ({ options, ...props }) => {
  return (
    <BaseSelect.Root alignItemToTrigger={false} {...props}>
      <BaseSelect.Trigger
        className={
          "border-border-grey data-[disabled]:bg-bg-select bg-bg-white text-text-title flex w-full cursor-pointer appearance-none items-center justify-between rounded-[4px] border px-2.5 py-2 text-sm focus-visible:outline focus-visible:outline-2"
        }
      >
        <BaseSelect.Value
          className={"text-sm"}
          placeholder={"選択してください"}
        />
        <BaseSelect.Icon className={"flex"}>
          {!props.disabled && <ArrowDownIcon />}
        </BaseSelect.Icon>
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner sideOffset={4}>
          <BaseSelect.Popup
            className={
              "group border-border-grey bg-bg-white text-text-title flex flex-col rounded-md border py-1 shadow-[0_4px_8px_0_rgba(17,17,26,0.05)] transition-[transform,scale,opacity] duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0"
            }
          >
            <div
              className={
                "flex max-h-[190px] min-h-0 flex-1 flex-col overflow-y-scroll"
              }
            >
              {options.map((option) => (
                <BaseSelect.Item
                  className={
                    "data-[highlighted]:before:bg-bg-select grid min-w-[var(--anchor-width)] cursor-pointer grid-cols-[0.75rem_1fr] items-center gap-2 p-2 leading-4 outline-none select-none group-data-[side=none]:min-w-[calc(var(--anchor-width)+1rem)] group-data-[side=none]:pr-12 group-data-[side=none]:text-base group-data-[side=none]:leading-4 data-[highlighted]:relative data-[highlighted]:z-0 data-[highlighted]:before:absolute data-[highlighted]:before:inset-x-1 data-[highlighted]:before:inset-y-0 data-[highlighted]:before:z-[-1] data-[highlighted]:before:rounded-sm"
                  }
                  key={option.value}
                  value={option.value}
                >
                  <BaseSelect.ItemIndicator className={"col-start-1"}>
                    <CheckIcon size={14} />
                  </BaseSelect.ItemIndicator>
                  <BaseSelect.ItemText className={"col-start-2 text-sm"}>
                    {option.label}
                  </BaseSelect.ItemText>
                </BaseSelect.Item>
              ))}
            </div>
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
};
