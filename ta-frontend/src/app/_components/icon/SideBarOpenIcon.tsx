import { FC } from "react";

import { IconBase, IconProps } from "./IconBase";

export const SideBarOpenIcon: FC<IconProps> = (props) => {
  return (
    <IconBase {...props}>
      <path
        d={
          "M1 3V13C1 13.2652 1.10536 13.5196 1.29289 13.7071C1.48043 13.8946 1.73478 14 2 14H14C14.2652 14 14.5196 13.8946 14.7071 13.7071C14.8946 13.5196 15 13.2652 15 13V3C15 2.73478 14.8946 2.48043 14.7071 2.29289C14.5196 2.10536 14.2652 2 14 2H2C1.73478 2 1.48043 2.10536 1.29289 2.29289C1.10536 2.48043 1 2.73478 1 3ZM11 3H14V13H11V3ZM2 3H10V7.5H4.915L6.705 5.705L6 5L3 8L6 11L6.705 10.295L4.915 8.5H10V13H2V3Z"
        }
        fill={"black"}
      />
    </IconBase>
  );
};
