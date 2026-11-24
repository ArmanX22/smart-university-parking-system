import { UserRole } from "@prisma/client";

const DEMO_ROLES: Readonly<Record<string, UserRole>> = {
  "admin@university.edu": UserRole.ADMIN,
  "attendant@university.edu": UserRole.ATTENDANT,
  "driver@university.edu": UserRole.DRIVER,
};

export function resolveCredentialRole(
  email: string,
  _requestedRole?: string
): UserRole {
  return DEMO_ROLES[email.trim().toLowerCase()] ?? UserRole.DRIVER;
}

export function requireProductionSecret(
  name: string,
  value: string | undefined,
  nodeEnv: string | undefined,
  localFallback?: string
): string {
  if (value) return value;
  if (nodeEnv === "production") {
    throw new Error(`${name} is required in production`);
  }
  if (localFallback) return localFallback;
  throw new Error(`${name} is required`);
}
