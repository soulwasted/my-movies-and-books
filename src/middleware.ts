import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

const isPublicRoute = createRouteMatcher([
  "/(cs|en)/sign-in(.*)",
  "/(cs|en)/sign-up(.*)",
  "/(cs|en)/login(.*)",
  "/api/genres",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  if (req.nextUrl.pathname.startsWith("/api")) {
    return;
  }

  return intlMiddleware(req);
});

export const config = {
  matcher: [
    "/((?!_next|_vercel|.*\\..*).*)",
    "/api/(.*)",
  ],
};
