import { type FC } from "react";

import { IconBase, type IconProps } from "./IconBase";

export const ArrowDownIcon: FC<IconProps> = (props) => {
  return (
    <IconBase {...props}>
      <path
        d={
          "M8 11L3 5.99999L3.7 5.29999L8 9.59999L12.3 5.29999L13 5.99999L8 11Z"
        }
        fill={"black"}
      />
    </IconBase>
  );
};
