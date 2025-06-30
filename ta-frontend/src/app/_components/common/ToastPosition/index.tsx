import clsx from "clsx";
import { toast as sonnerToast } from "sonner";

import { CheckedFilledIcon } from "../../icon/CheckedFilledIcon";
import { WarningFilledIcon } from "../../icon/WarningFilledIcon";

const toast = (
  text: string,
  args?: {
    type?: "success" | "error";
    duration?: number;
  },
) => {
  const { type = "success", duration = 3000 } = args ?? {};

  return sonnerToast.custom(
    (id) => (
      <div
        className={clsx(
          "flex max-w-[364px] cursor-pointer items-center rounded-lg p-4 shadow-lg",
          type === "success" ? "bg-bg-darkGrey" : "bg-bg-red",
        )}
        onClick={() => {
          sonnerToast.dismiss(id);
        }}
      >
        <div className={"flex flex-1 items-center gap-2"}>
          {type === "success" ? (
            <CheckedFilledIcon color={"white"} />
          ) : (
            <WarningFilledIcon color={"white"} />
          )}
          <div className={"w-full"}>
            <p className={"text-bg-white text-sm font-bold"}>{text}</p>
          </div>
        </div>
      </div>
    ),
    {
      duration,
    },
  );
};

export { toast };
