import { FC } from "react";

import { IconBase, IconProps } from "./IconBase";

export const ListIcon: FC<IconProps> = (props) => {
  return (
    <IconBase {...props}>
      <path
        d={
          "M5 3H14V4H5V3ZM5 12H14V13H5V12ZM5 7.5H14V8.5H5V7.5ZM2 7.5H3V8.5H2V7.5ZM2 3H3V4H2V3ZM2 12H3V13H2V12Z"
        }
        fill={"black"}
      />
    </IconBase>
  );
};
