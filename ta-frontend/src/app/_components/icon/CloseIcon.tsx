import { type FC } from "react";

import { IconBase, type IconProps } from "./IconBase";

export const CloseIcon: FC<IconProps> = (props) => {
  return (
    <IconBase {...props}>
      <path
        d={
          "M8.707 8L13 3.707L12.293 3L8 7.293L3.707 3L3 3.707L7.293 8L3 12.293L3.707 13L8 8.707L12.293 13L13 12.293L8.707 8Z"
        }
        fill={"black"}
      />
    </IconBase>
  );
};
