import { FC } from "react";

import { IconBase, IconProps } from "./IconBase";

export const AnalyticsIcon: FC<IconProps> = (props) => {
  return (
    <IconBase {...props}>
      <path
        d={
          "M2 14V2H3V13H14V14H2ZM5 11V8H6V11H5ZM8 11V6H9V11H8ZM11 11V4H12V11H11ZM14 11V9H15V11H14Z"
        }
        fill={"black"}
      />
    </IconBase>
  );
};
