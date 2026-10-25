import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// The cron endpoint authenticates with CRON_SECRET instead of a Clerk session.
const isPublicRoute = createRouteMatcher([
  "/auth/sign-in(.*)",
  "/__clerk(.*)",
  "/api/cron/recurrences",
]);

export default clerkMiddleware(
  async (auth, request) => {
    if (!isPublicRoute(request)) {
      await auth.protect({
        unauthenticatedUrl: new URL("/auth/sign-in", request.url).toString(),
      });
    }
  },
  { signInUrl: "/auth/sign-in" },
);

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
    // Always run for Clerk-specific frontend API routes
    "/__clerk/(.*)",
  ],
};
