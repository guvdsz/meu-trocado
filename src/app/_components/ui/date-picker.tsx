"use client";

import { useState, type Ref } from "react";
import { CalendarDays } from "lucide-react";
import { parseISO, format } from "date-fns";
import { ptBR } from "react-day-picker/locale";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export function DatePicker({
  value,
  onChange,
  today,
  id,
  disabled,
  invalid,
  describedBy,
  onBlur,
  triggerRef,
}: {
  value: string;
  onChange: (value: string) => void;
  today: string;
  id: string;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  onBlur?: () => void;
  triggerRef?: Ref<HTMLButtonElement>;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? parseISO(value) : undefined;
  const lastDay = parseISO(today);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<Button variant="outline" className="date-trigger" />}
        id={id}
        disabled={disabled}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        ref={triggerRef}
        onBlur={onBlur}
      >
        <CalendarDays aria-hidden="true" />
        {selected ? format(selected, "dd/MM/yyyy") : "Selecionar data"}
      </PopoverTrigger>
      <PopoverContent
        className="calendar-popover"
        align="start"
        aria-label="Escolher data da movimentação"
      >
        <Calendar
          mode="single"
          locale={ptBR}
          captionLayout="dropdown"
          today={lastDay}
          defaultMonth={selected ?? lastDay}
          selected={selected}
          startMonth={parseISO("2000-01-01")}
          endMonth={lastDay}
          disabled={{ after: lastDay }}
          onSelect={(date) => {
            if (date) {
              onChange(format(date, "yyyy-MM-dd"));
              setOpen(false);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
