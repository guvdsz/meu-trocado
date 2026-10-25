/** Converts digit entry into an exact decimal string (the last two digits are cents). */
export function moneyFromInput(
  text: string,
  allowNegative = false,
): string | null {
  if (!text.trim()) return "";
  const numeric = text.trim().replace(/^R\$\s*/, "");
  if (!/^-?[\d.,\s]*$/.test(numeric)) return null;
  const negative = text.includes("-");
  if (negative && !allowNegative) return null;
  const digits = text.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  if (!digits) return negative ? "-" : "";
  if (digits.length > 15) return null;
  const padded = digits.padStart(3, "0");
  return `${negative ? "-" : ""}${padded.slice(0, -2)}.${padded.slice(-2)}`;
}

export function formatMoneyInput(value: string): string {
  if (!value || value === "-") return value;
  const negative = value.startsWith("-");
  const [integer, fraction = ""] = value.replace(/^-/, "").split(".");
  return `${negative ? "-" : ""}${integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${fraction.padEnd(2, "0")}`;
}

export function caretFromRight(value: string, digitsRight: number): number {
  if (!digitsRight) return value.length;
  let remaining = digitsRight;
  for (let index = value.length - 1; index >= 0; index--) {
    if (/\d/.test(value[index]) && --remaining === 0) return index;
  }
  return value.startsWith("-") ? 1 : 0;
}
