import { FC } from "react";

import { IconBase, IconProps } from "./IconBase";

export const SideBarCloseFilledIcon: FC<IconProps> = (props) => {
  return (
    <IconBase {...props}>
      <path
        d={
          "M14 2H2C1.45 2 1 2.45 1 3V13C1 13.55 1.45 14 2 14H14C14.55 14 15 13.55 15 13V3C15 2.45 14.55 2 14 2ZM14 7.5H8.9L10.7 5.7L10 5L7 8L10 11L10.7 10.3L8.9 8.5H14V13H6V3H14V7.5Z"
        }
        fill={"black"}
      />
    </IconBase>
  );
};
