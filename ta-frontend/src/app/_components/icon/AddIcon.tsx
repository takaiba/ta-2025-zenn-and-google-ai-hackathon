import { FC } from "react";

import { IconBase, IconProps } from "./IconBase";

export const AddIcon: FC<IconProps> = (props) => {
  return (
    <IconBase {...props}>
      <path
        d={"M8.5 7.5V4H7.5V7.5H4V8.5H7.5V12H8.5V8.5H12V7.5H8.5Z"}
        fill={"black"}
      />
    </IconBase>
  );
};
