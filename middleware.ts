import createMiddleware from "next-intl/middleware";
import { DEFAULT_LOCALE, LOCALES } from "@/i18n/request";

export default createMiddleware({
  // A list of all locales that are supported
  locales: LOCALES,

  // Used when no locale matches
  defaultLocale: DEFAULT_LOCALE,

  // We'll detect the locale from the Accept-Language header
  // and from the 'language' query parameter
  localeDetection: true,
  localePrefix: "never",
});

export const config = {
  // Match all routes except:
  // - /api (API routes)
  // - /_next (Next.js internals)
  // - all files with extensions
  matcher: ["/((?!api|_next|.*\\.[^/]*$).*)"],
};
