import { createHash, timingSafeEqual } from "crypto";

export function isResetAuthorized(
  authorizationHeader: string | null,
  expectedSecret: string
): boolean {
  if (!authorizationHeader?.startsWith("Bearer ") || !expectedSecret) return false;
  const supplied = authorizationHeader.slice("Bearer ".length);
  const suppliedHash = createHash("sha256").update(supplied).digest();
  const expectedHash = createHash("sha256").update(expectedSecret).digest();
  return timingSafeEqual(suppliedHash, expectedHash);
}
