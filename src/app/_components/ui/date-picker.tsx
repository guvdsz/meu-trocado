"use client";

import { usePreferences } from "@/app/(private)/_components/preferences-context";

import { controlStyles, controlSurface } from "./control-styles";
import { useState, type Ref } from "react";
import { CalendarDays } from "lucide-react";
import { parseISO, format } from "date-fns";
import { ptBR, enUS } from "react-day-picker/locale";
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
  future = false,
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
  future?: boolean;
}) {
  const { locale } = usePreferences();
  const [open, setOpen] = useState(false);
  const selected = value ? parseISO(value) : undefined;
  const lastDay = parseISO(today);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={`date-trigger flex h-12 min-h-12 items-center justify-start gap-2 text-left font-normal [&_svg]:size-4 [&_svg]:shrink-0 ${controlSurface} ${controlStyles}`}
          />
        }
        id={id}
        disabled={disabled}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        ref={triggerRef}
        onBlur={onBlur}
      >
        <CalendarDays aria-hidden="true" />
        {selected ? format(selected, locale === "en-US" ? "MM/dd/yyyy" : "dd/MM/yyyy") : "Selecionar data"}
      </PopoverTrigger>
      <PopoverContent
        className="calendar-popover w-auto max-w-[calc(100vw-24px)] p-2 [&_[data-slot=calendar]]:[--cell-size:40px] [&_[data-slot=button]]:h-10 [&_[data-slot=button]]:min-h-10 [&_th]:text-sm [&_select]:text-sm max-[650px]:[&_[data-slot=calendar]]:[--cell-size:36px] max-[650px]:[&_[data-slot=button]]:h-9 max-[650px]:[&_[data-slot=button]]:min-h-9"
        align="start"
        aria-label="Escolher data da movimentação"
      >
        <Calendar
          mode="single"
          locale={locale === "en-US" ? enUS : ptBR}
          captionLayout="dropdown"
          today={lastDay}
          defaultMonth={selected ?? lastDay}
          selected={selected}
          startMonth={future ? lastDay : parseISO("2000-01-01")}
          endMonth={future ? parseISO("2099-12-31") : lastDay}
          disabled={future ? { before: lastDay } : { after: lastDay }}
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
