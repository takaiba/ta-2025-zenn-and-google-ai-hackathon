import { type FC } from "react";

import { IconBase, type IconProps } from "./IconBase";

export const AudioStopFilledIcon: FC<IconProps> = (props) => {
  return (
    <IconBase {...props}>
      <path
        d={
          "M12 3H4C3.73478 3 3.48043 3.10536 3.29289 3.29289C3.10536 3.48043 3 3.73478 3 4V12C3 12.2652 3.10536 12.5196 3.29289 12.7071C3.48043 12.8946 3.73478 13 4 13H12C12.2652 13 12.5196 12.8946 12.7071 12.7071C12.8946 12.5196 13 12.2652 13 12V4C13 3.73478 12.8946 3.48043 12.7071 3.29289C12.5196 3.10536 12.2652 3 12 3Z"
        }
        fill={"black"}
      />
    </IconBase>
  );
};
