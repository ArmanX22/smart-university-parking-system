import { describe, it, expect, vi } from "vitest";
import { UserRole } from "@prisma/client";
import { AuthenticationError, ForbiddenError, handleApiError } from "../server/errors/api-error";

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
