import { FC } from "react";

import { IconBase, IconProps } from "./IconBase";

export const DownloadIcon: FC<IconProps> = (props) => {
  return (
    <IconBase {...props}>
      <path
        d={"M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"}
        stroke={"currentColor"}
        strokeWidth={"2"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        fill={"none"}
      />
      <polyline
        points={"7 10 12 15 17 10"}
        stroke={"currentColor"}
        strokeWidth={"2"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        fill={"none"}
      />
      <line
        x1={"12"}
        y1={"15"}
        x2={"12"}
        y2={"3"}
        stroke={"currentColor"}
        strokeWidth={"2"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      />
    </IconBase>
  );
};