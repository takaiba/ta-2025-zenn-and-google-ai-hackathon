import { IconBase, type IconProps } from "./IconBase";

/**
 * Slackアイコン
 */
export const SlackIcon = (props: IconProps) => {
  return (
    <IconBase {...props}>
      <path
        d={
          "M6.5 1.5C5.4 1.5 4.5 2.4 4.5 3.5C4.5 4.6 5.4 5.5 6.5 5.5H8.5V3.5C8.5 2.4 7.6 1.5 6.5 1.5ZM6.5 7.5H3.5C2.4 7.5 1.5 8.4 1.5 9.5C1.5 10.6 2.4 11.5 3.5 11.5C4.6 11.5 5.5 10.6 5.5 9.5V7.5H6.5Z"
        }
        fill={"currentColor"}
      />
      <path
        d={
          "M14.5 9.5C14.5 8.4 13.6 7.5 12.5 7.5C11.4 7.5 10.5 8.4 10.5 9.5V11.5H12.5C13.6 11.5 14.5 10.6 14.5 9.5ZM8.5 9.5V12.5C8.5 13.6 7.6 14.5 6.5 14.5C5.4 14.5 4.5 13.6 4.5 12.5C4.5 11.4 5.4 10.5 6.5 10.5H8.5V9.5Z"
        }
        fill={"currentColor"}
      />
      <path
        d={
          "M9.5 6.5V4.5H11.5C12.6 4.5 13.5 3.6 13.5 2.5C13.5 1.4 12.6 0.5 11.5 0.5C10.4 0.5 9.5 1.4 9.5 2.5V4.5C9.5 5.5 9.5 6.5 9.5 6.5ZM11.5 8.5H9.5V6.5H11.5V8.5Z"
        }
        fill={"currentColor"}
      />
    </IconBase>
  );
};
