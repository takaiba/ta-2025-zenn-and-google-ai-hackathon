import { IconBase, type IconProps } from "./IconBase";

/**
 * GoogleDriveアイコン
 */
export const GoogleDriveIcon = (props: IconProps) => {
  return (
    <IconBase {...props}>
      <path d={"M4.5 14.5L9 5.5L18 5.5L13.5 14.5H4.5Z"} fill={"currentColor"} />
      <path
        d={"M9 5.5L11.25 10H18L15.75 5.5H9Z"}
        fill={"currentColor"}
        fillOpacity={"0.4"}
      />
      <path
        d={"M11.25 10L9 14.5H15.75L18 10H11.25Z"}
        fill={"currentColor"}
        fillOpacity={"0.7"}
      />
    </IconBase>
  );
};
