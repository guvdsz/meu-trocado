import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";
import { cn } from "cn";
import { controlStyles, controlSurface } from "./control-styles";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        controlSurface,
        "h-12 min-h-12 file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#687761] disabled:pointer-events-none",
        controlStyles,
        className,
      )}
      {...props}
    />
  );
}

export { Input };
