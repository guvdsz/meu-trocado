import { createHash, timingSafeEqual } from "node:crypto";

export function isCronAuthorized(
  authorization: string | null,
  secret: string | undefined,
) {
  if (!secret || !authorization) return false;
  const hash = (text: string) => createHash("sha256").update(text).digest();
  return timingSafeEqual(hash(authorization), hash(`Bearer ${secret}`));
}
