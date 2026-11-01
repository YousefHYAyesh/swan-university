import "server-only";
import { eq } from "drizzle-orm";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { users, type Role } from "@/db/schema";

const SESSION_COOKIE = "swan_session";
const MAX_AGE = 60 * 60 * 8; // one working day

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters");
  return new TextEncoder().encode(value);
}

export interface SessionUser {
  id: number;
  role: Role;
  email: string;
  firstName: string;
  lastName: string;
}

export async function createSession(user: { id: number; role: Role; sessionVersion: number }) {
  const token = await new SignJWT({ role: user.role, v: user.sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

async function readToken(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return { userId: Number(payload.sub), role: payload.role as Role, version: payload.v as number };
  } catch {
    return null;
  }
}

/** The signed-in user, checked against the database once per request. */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const token = await readToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!token) return null;
  const user = await db.query.users.findFirst({ where: eq(users.id, token.userId) });
  if (!user || !user.isActive || user.sessionVersion !== token.version) return null;
  return { id: user.id, role: user.role, email: user.email, firstName: user.firstName, lastName: user.lastName };
});

/** Use at the top of pages and server actions. Redirects if the role doesn't match. */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect("/login");
  if (roles.length && !roles.includes(user.role)) redirect(homeFor(user.role));
  return user;
}

export function homeFor(role: Role) {
  return { ADMIN: "/admin", REGISTRAR: "/registrar", PROFESSOR: "/professor", STUDENT: "/student" }[role];
}
