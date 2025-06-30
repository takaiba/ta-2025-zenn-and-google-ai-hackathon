import { type FC } from "react";

import { IconBase, type IconProps } from "./IconBase";

export const ArrowRightIcon: FC<IconProps> = (props) => {
  return (
    <IconBase {...props}>
      <path
        d={
          "M11 8L5.99999 13L5.29999 12.3L9.59999 8L5.29999 3.7L5.99999 3L11 8Z"
        }
        fill={"black"}
      />
    </IconBase>
  );
};
