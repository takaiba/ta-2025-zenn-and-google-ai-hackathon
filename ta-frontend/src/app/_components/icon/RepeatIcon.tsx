import { FC } from "react";

import { IconBase, IconProps } from "./IconBase";

export const RepeatIcon: FC<IconProps> = (props) => {
  return (
    <IconBase {...props}>
      <path
        d={
          "M3 3H13.086L11.293 1.207L12 0.5L15 3.5L12 6.5L11.293 5.793L13.086 4H3V7.5H2V4C2.00026 3.73486 2.10571 3.48066 2.29319 3.29319C2.48066 3.10571 2.73486 3.00026 3 3ZM4.707 10.207L2.914 12H13V8.5H14V12C13.9997 12.2651 13.8943 12.5193 13.7068 12.7068C13.5193 12.8943 13.2651 12.9997 13 13H2.914L4.707 14.793L4 15.5L1 12.5L4 9.5L4.707 10.207Z"
        }
        fill={"black"}
      />
    </IconBase>
  );
};
