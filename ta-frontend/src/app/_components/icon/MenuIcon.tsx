import { FC } from "react";

import { IconBase, IconProps } from "./IconBase";

export const MenuIcon: FC<IconProps> = (props) => {
  return (
    <IconBase {...props}>
      <path d={"M14 3V4H2V3H14Z"} fill={"black"} />
      <path d={"M14 7.5V8.5H2V7.5H14Z"} fill={"black"} />
      <path d={"M14 12V13H2V12H14Z"} fill={"black"} />
    </IconBase>
  );
};
