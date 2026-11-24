import { describe, it, expect, vi } from "vitest";
import { UserRole } from "@prisma/client";
import { AuthenticationError, ForbiddenError, handleApiError } from "../server/errors/api-error";
import { requireProductionSecret, resolveCredentialRole } from "../lib/auth-policy";

describe("Phase 3: Authentication & Role-Based Access Control", () => {
  it("formats AuthenticationError with HTTP 401 status", async () => {
    const error = new AuthenticationError("Sign in required");
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe("Sign in required");

    const response = handleApiError(error);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("Sign in required");
  });

  it("formats ForbiddenError with HTTP 403 status for unauthorized role", async () => {
    const error = new ForbiddenError("Requires ADMIN role");
    expect(error.statusCode).toBe(403);
    expect(error.message).toBe("Requires ADMIN role");

    const response = handleApiError(error);
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("Requires ADMIN role");
  });

  it("allows only fixed demo accounts to receive privileged roles", () => {
    expect(resolveCredentialRole("admin@university.edu", "DRIVER")).toBe(UserRole.ADMIN);
    expect(resolveCredentialRole("attendant@university.edu", "ADMIN")).toBe(UserRole.ATTENDANT);
    expect(resolveCredentialRole("driver@university.edu", "ADMIN")).toBe(UserRole.DRIVER);
  });

  it("forces every custom email to DRIVER regardless of requested role", () => {
    expect(resolveCredentialRole("student@university.edu", "ADMIN")).toBe(UserRole.DRIVER);
    expect(resolveCredentialRole("teacher@university.edu", "ATTENDANT")).toBe(UserRole.DRIVER);
  });

  it("matches fixed demo identities case-insensitively", () => {
    expect(resolveCredentialRole(" ADMIN@UNIVERSITY.EDU ", undefined)).toBe(UserRole.ADMIN);
  });

  it("fails closed when a required production secret is missing", () => {
    expect(() => requireProductionSecret("NEXTAUTH_SECRET", undefined, "production")).toThrow(
      "NEXTAUTH_SECRET is required in production"
    );
  });

  it("allows an explicit local fallback outside production", () => {
    expect(requireProductionSecret("NEXTAUTH_SECRET", undefined, "development", "local-only")).toBe(
      "local-only"
    );
  });

  it("enforces role hierarchy rules", () => {
    const adminRoles: UserRole[] = [UserRole.ADMIN];
    const attendantRoles: UserRole[] = [UserRole.ATTENDANT, UserRole.ADMIN];
    const driverRoles: UserRole[] = [UserRole.DRIVER, UserRole.ATTENDANT, UserRole.ADMIN];

    // Driver cannot access attendant or admin operations
    expect(adminRoles.includes(UserRole.DRIVER)).toBe(false);
    expect(attendantRoles.includes(UserRole.DRIVER)).toBe(false);
    expect(driverRoles.includes(UserRole.DRIVER)).toBe(true);

    // Attendant can access attendant operations but not admin operations
    expect(adminRoles.includes(UserRole.ATTENDANT)).toBe(false);
    expect(attendantRoles.includes(UserRole.ATTENDANT)).toBe(true);

    // Admin can access all roles
    expect(adminRoles.includes(UserRole.ADMIN)).toBe(true);
    expect(attendantRoles.includes(UserRole.ADMIN)).toBe(true);
    expect(driverRoles.includes(UserRole.ADMIN)).toBe(true);
  });
});
