import "server-only";

import { Role, type User } from "@prisma/client";

import { getCurrentUser } from "@/server/auth";

export class UnauthorizedError extends Error {
  constructor(message = "You must be signed in to do that.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to do that.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** Ensures a user is authenticated. Throws UnauthorizedError otherwise. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

/** Ensures the authenticated user is an admin. Throws otherwise. */
export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== Role.ADMIN) throw new ForbiddenError();
  return user;
}
