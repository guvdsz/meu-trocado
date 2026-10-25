"use client";

import { usePreferences } from "./preferences-context";

import { controlStyles } from "@/app/_components/ui/control-styles";
import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/app/_components/ui/popover";

export function MonthPicker({
  value,
  today,
  onChange,
}: {
  value: string;
  today: string;
  onChange: (value: string) => void;
}) {
  const { locale } = usePreferences();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(Number(value.slice(0, 4)));
  const label = new Date(`${value}-01T12:00:00Z`).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<Button variant="outline" className={`period-trigger min-w-[195px] justify-start! border-[#c9d3c0] bg-white text-sm! shadow-[0_1px_2px_#29433306] max-[650px]:min-w-0 focus-visible:ring-0 ${controlStyles}`} />}
        aria-label={`Alterar período: ${label}`}
      >
        <CalendarDays aria-hidden="true" />
        {label.charAt(0).toLocaleUpperCase("pt-BR") + label.slice(1)}
      </PopoverTrigger>
      <PopoverContent className="period-popover w-[290px] gap-3.5 p-[18px]" align="end">
        <PopoverTitle>Selecionar período</PopoverTitle>
        <div className="period-year flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Ano anterior"
            disabled={year <= 2000}
            onClick={() => setYear(year - 1)}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <strong aria-live="polite">{year}</strong>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Próximo ano"
            disabled={year >= Number(today.slice(0, 4))}
            onClick={() => setYear(year + 1)}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
        <div className="period-grid grid grid-cols-3 gap-1.5 [&_button]:capitalize">
          {Array.from({ length: 12 }, (_, index) => {
            const month = `${year}-${String(index + 1).padStart(2, "0")}`;
            const name = new Date(`${month}-01T12:00:00Z`)
              .toLocaleDateString(locale, { month: "short", timeZone: "UTC" })
              .replace(".", "");
            return (
              <Button
                key={month}
                variant={month === value ? "default" : "ghost"}
                disabled={month > today.slice(0, 7)}
                aria-pressed={month === value}
                onClick={() => {
                  onChange(month);
                  setOpen(false);
                }}
              >
                {name}
              </Button>
            );
          })}
        </div>
        <Button
          variant="outline"
          onClick={() => {
            onChange(today.slice(0, 7));
            setYear(Number(today.slice(0, 4)));
            setOpen(false);
          }}
        >
          Mês atual
        </Button>
      </PopoverContent>
    </Popover>
  );
}
