import { FC } from "react";

import { HelpIcon } from "../../icon/HelpIcon";
import { Tooltip } from "../Tooltip";

type Props = {
  text: string;
};

export const QuestionTooltip: FC<Props> = (props) => {
  return (
    <Tooltip text={props.text}>
      <HelpIcon />
    </Tooltip>
  );
};
