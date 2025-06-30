import { FC } from "react";

type Props = {
  size?: number;
  color?: string;
};

export const TrashIcon: FC<Props> = (props) => {
  const { size = 24, color = "black" } = props;
  return (
    <svg
      width={size}
      height={size}
      viewBox={"0 0 24 24"}
      fill={"none"}
      xmlns={"http://www.w3.org/2000/svg"}
    >
      <path
        d={
          "M5 5L6 22H18L19 5M5 5H19M5 5H3M19 5H21M9 5L10 2H14L15 5M9 5H15M10 10V17M14 10V17"
        }
        stroke={
          color === "white"
            ? "#FFFFFF"
            : color === "blue"
              ? "#4299E1"
              : "#000000"
        }
        strokeWidth={"2"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      />
    </svg>
  );
};
