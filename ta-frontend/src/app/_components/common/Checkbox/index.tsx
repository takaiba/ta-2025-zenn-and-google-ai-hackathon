import { Checkbox as BaseCheckbox } from "@base-ui-components/react/checkbox";
import React from "react";

import { CheckIcon } from "../../icon/CheckIcon";
import { MinusIcon } from "../../icon/MinusIcon";

const Checkbox = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseCheckbox.Root> & { label?: string }
>((props, ref) => (
  <label className={"flex items-center gap-2"}>
    <BaseCheckbox.Root
      ref={ref}
      className={`border-text-description data-[checked]:bg-bg-darkGrey relative flex size-[18px] appearance-none items-center justify-center rounded-[4px] border transition-colors duration-50 ease-in-out`}
      {...props}
    >
      <BaseCheckbox.Indicator>
        {props.indeterminate ? (
          <MinusIcon color={"white"} />
        ) : (
          <CheckIcon color={"white"} />
        )}
      </BaseCheckbox.Indicator>
    </BaseCheckbox.Root>
    {props.label && (
      <span className={"text-text-description"}>{props.label}</span>
    )}
  </label>
));
Checkbox.displayName = "Checkbox";

export { Checkbox };
