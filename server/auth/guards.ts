import { getServerSession } from "next-auth/next";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { AuthenticationError, ForbiddenError, NotFoundError } from "@/server/errors/api-error";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role: UserRole;
}

/**
 * Retrieves the current session on the server.
 */
export async function getServerAuthSession() {
  return await getServerSession(authOptions);
}

/**
 * Ensures the requester is authenticated. Returns the user record.
 * Throws AuthenticationError (401) if not logged in.
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
  const session = await getServerAuthSession();

  if (!session?.user?.id || !session?.user?.email) {
    throw new AuthenticationError("You must be logged in to access this resource.");
  }

  // Verify against TiDB to prevent stale sessions
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
    },
  });

  if (!dbUser) {
    throw new AuthenticationError("User account no longer exists or was deactivated.");
  }

  return dbUser;
}

/**
 * Ensures the requester has at least one of the permitted roles.
 * Throws ForbiddenError (403) if the user's role is not authorized.
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<AuthenticatedUser> {
  const user = await requireAuth();

  if (!allowedRoles.includes(user.role)) {
    throw new ForbiddenError(
      `Access denied. Requires one of roles: [${allowedRoles.join(", ")}]. Current role: ${user.role}`
    );
  }

  return user;
}

/**
 * Guard requiring ADMIN role.
 */
export async function requireAdmin(): Promise<AuthenticatedUser> {
  return requireRole([UserRole.ADMIN]);
}

/**
 * Guard requiring ATTENDANT or ADMIN role.
 */
export async function requireAttendant(): Promise<AuthenticatedUser> {
  return requireRole([UserRole.ATTENDANT, UserRole.ADMIN]);
}

/**
 * Guard requiring DRIVER, ATTENDANT, or ADMIN role.
 */
export async function requireDriver(): Promise<AuthenticatedUser> {
  return requireRole([UserRole.DRIVER, UserRole.ATTENDANT, UserRole.ADMIN]);
}

/**
 * Retrieves the parking area assigned to the given attendant.
 */
export async function getAttendantAssignedArea(userId: string) {
  const assignment = await prisma.attendantAssignment.findFirst({
    where: { userId },
    include: {
      area: {
        include: {
          slots: {
            include: {
              category: true,
            },
          },
        },
      },
    },
  });

  if (!assignment) {
    throw new NotFoundError("Attendant is not assigned to any parking area.");
  }

  return assignment.area;
}
