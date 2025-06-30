import { Menu as MenuPrimitive } from "@base-ui-components/react/menu";
import { FC, PropsWithChildren } from "react";

type MenuProps = PropsWithChildren<{
  triggerElement: React.ReactNode;
}>;

export const Menu: FC<MenuProps> = (props) => {
  return (
    <MenuPrimitive.Root>
      <MenuPrimitive.Trigger
        className={
          "flex items-center justify-center rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-1"
        }
      >
        {props.triggerElement}
      </MenuPrimitive.Trigger>
      <MenuPrimitive.Portal>
        <MenuPrimitive.Positioner className={"outline-none"} sideOffset={8}>
          <MenuPrimitive.Popup
            className={
              "text-text-title outline-border-grey origin-[var(--transform-origin)] rounded-md bg-[canvas] py-1 shadow-[0_4px_8px_0_rgba(17,17,26,0.1)] outline outline-1 transition-[transform,scale,opacity] data-[ending-style]:scale-90 data-[ending-style]:opacity-0 data-[starting-style]:scale-90 data-[starting-style]:opacity-0"
            }
          >
            {props.children}
          </MenuPrimitive.Popup>
        </MenuPrimitive.Positioner>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  );
};

type MenuItemProps = PropsWithChildren<{
  onClick?: () => void;
}>;

export const MenuItem: FC<MenuItemProps> = (props) => {
  return (
    <MenuPrimitive.Item
      className={
        "data-[highlighted]:text-text-title data-[highlighted]:before:bg-bg-select flex cursor-pointer py-2 pr-8 pl-4 text-sm leading-4 outline-none select-none data-[highlighted]:relative data-[highlighted]:z-0 data-[highlighted]:before:absolute data-[highlighted]:before:inset-x-1 data-[highlighted]:before:inset-y-0 data-[highlighted]:before:z-[-1] data-[highlighted]:before:rounded-sm"
      }
      onClick={props.onClick}
    >
      {props.children}
    </MenuPrimitive.Item>
  );
};
