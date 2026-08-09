import { Clock } from "lucide-react";
import * as React from "react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "~/components/ui/input-group";
import { cn } from "~/lib/utils";

type TimeInputProps = Omit<React.ComponentProps<"input">, "type"> & {
  unit?: string;
};

const TimeInput = React.forwardRef<HTMLInputElement, TimeInputProps>(
  ({ className, min = 0, unit, ...props }, ref) => {
    return (
      <InputGroup className={cn(className)}>
        <InputGroupAddon align="inline-start">
          <Clock aria-hidden />
        </InputGroupAddon>
        <InputGroupInput ref={ref} type="number" min={min} {...props} />
        {unit ? (
          <InputGroupAddon align="inline-end">
            <InputGroupText aria-hidden>{unit}</InputGroupText>
          </InputGroupAddon>
        ) : null}
      </InputGroup>
    );
  },
);
TimeInput.displayName = "TimeInput";

export { TimeInput };
