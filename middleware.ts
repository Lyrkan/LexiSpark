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
  matcher: ["/((?!api|_next|favicon.ico|robots.txt|.*\\..*).*)"],
};
