export function localToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
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

export function formatMoney(value: string): string {
  const cents = toCents(value);
  const absolute = cents < BigInt(0) ? -cents : cents;
  const integer = (absolute / BigInt(100)).toLocaleString("pt-BR");
  return `${cents < BigInt(0) ? "− " : ""}R$ ${integer},${String(absolute % BigInt(100)).padStart(2, "0")}`;
}

export function formatDay(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`));
}
