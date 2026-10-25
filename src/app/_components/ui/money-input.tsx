"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  type InputHTMLAttributes,
} from "react";
import { Plus, Minus } from "lucide-react";
import { Button } from "./button";
import {
  moneyFromInput,
  formatMoneyInput,
  caretFromRight,
} from "@/lib/money-input";

type MoneyInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
> & {
  value: string;
  onValueChange: (value: string) => void;
  allowNegative?: boolean;
};

export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  function MoneyInput(
    { value, onValueChange, allowNegative = false, disabled, ...props },
    forwardedRef,
  ) {
    const input = useRef<HTMLInputElement>(null);
    useImperativeHandle(forwardedRef, () => input.current!);
    function update(text: string, selection: number) {
      const next = moneyFromInput(text, allowNegative);
      if (next === null) return;
      const right = text.slice(selection).replace(/\D/g, "").length;
      onValueChange(next);
      // Restore before the next keyboard event so Ctrl+A and fast edits keep their selection.
      queueMicrotask(() => {
        const element = input.current;
        if (element && document.activeElement === element) {
          const position = caretFromRight(element.value, right);
          element.setSelectionRange(position, position);
        }
      });
    }
    return (
      <div
        className="money-input"
        data-invalid={
          props["aria-invalid"] === true || props["aria-invalid"] === "true"
        }
      >
        <span aria-hidden="true">R$</span>
        <input
          {...props}
          ref={input}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          disabled={disabled}
          value={formatMoneyInput(value)}
          onChange={(event) =>
            update(
              event.currentTarget.value,
              event.currentTarget.selectionStart ??
                event.currentTarget.value.length,
            )
          }
          onKeyDown={(event) => {
            props.onKeyDown?.(event);
            if (event.defaultPrevented) return;
            const element = event.currentTarget;
            const position = element.selectionStart ?? 0;
            if (
              position !== element.selectionEnd ||
              !["Backspace", "Delete"].includes(event.key)
            )
              return;
            const index = event.key === "Backspace" ? position - 1 : position;
            if (!/[.,]/.test(element.value[index] ?? "")) return;
            const direction = event.key === "Backspace" ? -1 : 1;
            let digit = index + direction;
            while (
              digit >= 0 &&
              digit < element.value.length &&
              !/\d/.test(element.value[digit])
            )
              digit += direction;
            if (digit < 0 || digit >= element.value.length) return;
            event.preventDefault();
            update(
              element.value.slice(0, digit) + element.value.slice(digit + 1),
              event.key === "Backspace" ? digit : position,
            );
          }}
        />
        {allowNegative && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="money-sign"
            disabled={disabled}
            aria-label={
              value.startsWith("-")
                ? "Usar saldo positivo"
                : "Usar saldo negativo"
            }
            aria-pressed={value.startsWith("-")}
            onClick={() => {
              onValueChange(
                value.startsWith("-") ? value.slice(1) : `-${value}`,
              );
              input.current?.focus();
            }}
          >
            {value.startsWith("-") ? (
              <Plus aria-hidden="true" />
            ) : (
              <Minus aria-hidden="true" />
            )}
          </Button>
        )}
      </div>
    );
  },
);
