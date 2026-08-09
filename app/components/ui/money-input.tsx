import * as React from "react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "~/components/ui/input-group";
import { cn } from "~/lib/utils";

type MoneyInputProps = Omit<
  React.ComponentProps<"input">,
  "type" | "prefix"
> & {
  currencySymbol: string;
};

const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  (
    { currencySymbol, className, min = 0, step = "0.01", ...props },
    ref,
  ) => {
    return (
      <InputGroup className={cn(className)}>
        <InputGroupAddon align="inline-start">
          <InputGroupText aria-hidden>{currencySymbol}</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput
          ref={ref}
          type="number"
          min={min}
          step={step}
          {...props}
        />
      </InputGroup>
    );
  },
);
MoneyInput.displayName = "MoneyInput";

export { MoneyInput };
