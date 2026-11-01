import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const AREAS: Record<string, string> = {
  "/admin": "ADMIN",
  "/registrar": "REGISTRAR",
  "/professor": "PROFESSOR",
  "/student": "STUDENT",
};
const HOME: Record<string, string> = {
  ADMIN: "/admin",
  REGISTRAR: "/registrar",
  PROFESSOR: "/professor",
  STUDENT: "/student",
};

// First line of defence: keep people out of other roles' areas.
// Pages and actions still re-check the session against the database.
export async function proxy(req: NextRequest) {
  const area = Object.keys(AREAS).find((p) => req.nextUrl.pathname.startsWith(p));
  const token = req.cookies.get("swan_session")?.value;
  let role: string | null = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.SESSION_SECRET));
      role = payload.role as string;
    } catch {
      role = null;
    }
  }

  if (req.nextUrl.pathname === "/login" && role) {
    return NextResponse.redirect(new URL(HOME[role], req.url));
  }
  if (!area) return NextResponse.next();
  if (!role) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  if (AREAS[area] !== role) return NextResponse.redirect(new URL(HOME[role], req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/registrar/:path*", "/professor/:path*", "/student/:path*", "/login"],
};
