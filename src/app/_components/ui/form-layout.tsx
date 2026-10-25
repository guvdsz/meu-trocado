import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function FormLayout({ className, ...props }: ComponentProps<"form">) {
  return (
    <form
      className={cn(
        "finance-form m-0 grid gap-5 [&_fieldset]:m-0 [&_fieldset]:grid [&_fieldset]:min-w-0 [&_fieldset]:gap-5",
        "[&_fieldset]:border-0 [&_fieldset]:p-0 [&_fieldset:disabled]:opacity-65",
        className,
      )}
      {...props}
    />
  );
}

export function FormField({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "finance-field flex min-w-0 flex-col gap-2 [&>label]:m-0 [&>label]:block [&>label]:text-sm",
        "[&>label]:leading-normal [&>label]:font-[550] [&>label]:text-[#405736]",
        className,
      )}
      {...props}
    />
  );
}

export function FormActions({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "finance-form-actions flex justify-end gap-2.5 border-t pt-5 [&>[data-slot=button]]:m-0 [&>[data-slot=button]]:h-11",
        "[&>[data-slot=button]]:min-h-11 [&>[data-slot=button]]:w-full [&>[data-slot=button]]:min-w-0 [&>[data-slot=button]]:flex-[1_1_0] [&>[data-slot=button]]:justify-center! [&>[data-slot=button]]:gap-2 [&>[data-slot=button]]:px-4 [&>[data-slot=button]]:py-2.5",
        "[&>[data-slot=button]]:text-sm! [&>[data-slot=button]]:leading-normal max-[400px]:gap-2 max-[400px]:[&>[data-slot=button]]:px-3",
        className,
      )}
      {...props}
    />
  );
}

