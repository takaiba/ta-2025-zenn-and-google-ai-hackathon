import { type FC } from "react";

import { IconBase, type IconProps } from "./IconBase";

export const ArrowUpIcon: FC<IconProps> = (props) => {
  return (
    <IconBase {...props}>
      <path
        d={"M8 5L13 10L12.3 10.7L8 6.4L3.7 10.7L3 10L8 5Z"}
        fill={"black"}
      />
    </IconBase>
  );
};
