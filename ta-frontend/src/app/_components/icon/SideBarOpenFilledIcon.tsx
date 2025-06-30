import { FC } from "react";

import { IconBase, IconProps } from "./IconBase";

export const SideBarOpenFilledIcon: FC<IconProps> = (props) => {
  return (
    <IconBase {...props}>
      <path
        d={
          "M14 2H2C1.45 2 1 2.45 1 3V13C1 13.55 1.45 14 2 14H14C14.55 14 15 13.55 15 13V3C15 2.45 14.55 2 14 2ZM14 13H6V8.5H11.1L9.3 10.3L10 11L13 8L10 5L9.3 5.7L11.1 7.5H6V3H14V13Z"
        }
        fill={"black"}
      />
    </IconBase>
  );
};
