export function localToday(now = new Date(), timeZone = "America/Sao_Paulo"): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function monthBounds(month: string) {
  const [year, value] = month.split("-").map(Number);
  const next =
    value === 12
      ? `${year + 1}-01`
      : `${year}-${String(value + 1).padStart(2, "0")}`;
  return { start: `${month}-01`, end: `${next}-01` };
}

export function resolveMonth(value: unknown, today: string): string {
  return typeof value === "string" &&
    /^20\d{2}-(0[1-9]|1[0-2])$/.test(value) &&
    value <= today.slice(0, 7)
    ? value
    : today.slice(0, 7);
}

export function toCents(value: string): bigint {
  const negative = value.startsWith("-");
  const [integer, fraction = ""] = value.replace(/^-/, "").split(".");
  const cents = BigInt(integer) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
  return negative ? -cents : cents;
}

export function fromCents(value: bigint): string {
  const absolute = value < BigInt(0) ? -value : value;
  return `${value < BigInt(0) ? "-" : ""}${absolute / BigInt(100)}.${String(absolute % BigInt(100)).padStart(2, "0")}`;
}

export function formatMoney(value: string, currency = "BRL", locale = "pt-BR"): string {
  const cents = toCents(value);
  const absolute = cents < BigInt(0) ? -cents : cents;
  const integer = (absolute / BigInt(100)).toLocaleString(locale);
  const decimal = new Intl.NumberFormat(locale).formatToParts(1.1).find(p => p.type === "decimal")!.value;
  const symbol = currency === "BRL" ? "R$" : currency;
  return `${cents < BigInt(0) ? "− " : ""}${symbol} ${integer}${decimal}${String(absolute % BigInt(100)).padStart(2, "0")}`;
}

export function formatDay(value: string, locale = "pt-BR"): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`));
}
