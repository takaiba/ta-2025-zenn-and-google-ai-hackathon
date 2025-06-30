import { type FC } from "react";

import { IconBase, type IconProps } from "./IconBase";

export const ArrowLeftIcon: FC<IconProps> = (props) => {
  return (
    <IconBase {...props}>
      <path
        d={"M5 8L10 3L10.7 3.7L6.4 8L10.7 12.3L10 13L5 8Z"}
        fill={"black"}
      />
    </IconBase>
  );
};
