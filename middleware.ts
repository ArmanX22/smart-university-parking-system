import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;
    const userRole = token?.role as UserRole | undefined;

    // Admin protected routes
    if (pathname.startsWith("/admin")) {
      if (userRole !== UserRole.ADMIN) {
        return NextResponse.redirect(new URL("/auth/unauthorized", req.url));
      }
    }

    // Attendant protected routes
    if (pathname.startsWith("/attendant")) {
      if (userRole !== UserRole.ATTENDANT && userRole !== UserRole.ADMIN) {
        return NextResponse.redirect(new URL("/auth/unauthorized", req.url));
      }
    }

    // Driver protected routes
    if (pathname.startsWith("/driver")) {
      if (!userRole) {
        return NextResponse.redirect(new URL("/auth/signin", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;

        // Public routes
        if (
          pathname === "/" ||
          pathname.startsWith("/auth") ||
          pathname.startsWith("/api/auth") ||
          pathname.startsWith("/_next") ||
          pathname.includes("favicon.ico")
        ) {
          return true;
        }

        // Protected routes require valid token
        return !!token;
      },
    },
    pages: {
      signIn: "/auth/signin",
    },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/attendant/:path*", "/driver/:path*"],
};
