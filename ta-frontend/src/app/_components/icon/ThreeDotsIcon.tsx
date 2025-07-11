import { type FC } from "react";

import { IconBase, type IconProps } from "./IconBase";

export const ThreeDotsIcon: FC<IconProps> = (props) => {
  return (
    <IconBase {...props}>
      <path
        d={
          "M4 9C4.55228 9 5 8.55228 5 8C5 7.44772 4.55228 7 4 7C3.44772 7 3 7.44772 3 8C3 8.55228 3.44772 9 4 9Z"
        }
        fill={"black"}
      />
      <path
        d={
          "M8 9C8.55228 9 9 8.55228 9 8C9 7.44772 8.55228 7 8 7C7.44772 7 7 7.44772 7 8C7 8.55228 7.44772 9 8 9Z"
        }
        fill={"black"}
      />
      <path
        d={
          "M12 9C12.5523 9 13 8.55228 13 8C13 7.44772 12.5523 7 12 7C11.4477 7 11 7.44772 11 8C11 8.55228 11.4477 9 12 9Z"
        }
        fill={"black"}
      />
    </IconBase>
  );
};
