import { type FC } from "react";

import { IconBase, type IconProps } from "./IconBase";

export const MinusIcon: FC<IconProps> = (props) => {
  return (
    <IconBase {...props}>
      <path d={"M4 7.5H12V8.5H4V7.5Z"} fill={"black"} />
    </IconBase>
  );
};
