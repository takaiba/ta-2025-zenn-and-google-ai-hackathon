import { type FC } from "react";

import { IconBase, type IconProps } from "./IconBase";

export const MinutesIcon: FC<IconProps> = (props) => {
  return (
    <IconBase {...props}>
      <path
        d={
          "M13 1H4C3.73478 1 3.48043 1.10536 3.29289 1.29289C3.10536 1.48043 3 1.73478 3 2V4H2V5H3V7.5H2V8.5H3V11H2V12H3V14C3 14.2652 3.10536 14.5196 3.29289 14.7071C3.48043 14.8946 3.73478 15 4 15H13C13.2652 15 13.5196 14.8946 13.7071 14.7071C13.8946 14.5196 14 14.2652 14 14V2C14 1.73478 13.8946 1.48043 13.7071 1.29289C13.5196 1.10536 13.2652 1 13 1ZM13 14H4V12H5V11H4V8.5H5V7.5H4V5H5V4H4V2H13V14Z"
        }
        fill={"black"}
      />
      <path
        d={"M7 4H11V5H7V4ZM7 7.5H11V8.5H7V7.5ZM7 11H11V12H7V11Z"}
        fill={"black"}
      />
    </IconBase>
  );
};
