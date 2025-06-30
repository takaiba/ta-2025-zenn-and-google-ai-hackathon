import { type FC } from "react";

import { IconBase, type IconProps } from "./IconBase";

export const CheckIcon: FC<IconProps> = (props) => {
  return (
    <IconBase {...props}>
      <path
        d={
          "M6.5 12L2 7.50003L2.707 6.79303L6.5 10.5855L13.293 3.79303L14 4.50003L6.5 12Z"
        }
        fill={"black"}
      />
    </IconBase>
  );
};
