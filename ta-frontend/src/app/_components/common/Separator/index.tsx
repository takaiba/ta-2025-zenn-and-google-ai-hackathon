import { Separator as BaseSeparator } from "@base-ui-components/react";
import clsx from "clsx";
import { FC } from "react";

type Props = {
  orientation: "horizontal" | "vertical";
};

export const Separator: FC<Props> = (props) => {
  return (
    <BaseSeparator
      orientation={props.orientation}
      className={clsx(
        "bg-border-grey",
        props.orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
      )}
    />
  );
};
