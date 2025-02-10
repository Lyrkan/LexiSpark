import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";

export const LOCALES = ["en", "fr"] as const;
export const DEFAULT_LOCALE = "en";

type Locale = (typeof LOCALES)[number];

// Create a middleware function that validates the locale
function validateLocale(locale: string): locale is Locale {
  // Reject any locale that contains a dot
  if (locale.includes(".")) {
    return false;
  }
  // Only allow locales from our predefined list
  return LOCALES.includes(locale as Locale);
}

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) || DEFAULT_LOCALE;

  // Validate the locale and throw 404 if invalid
  if (!validateLocale(locale)) {
    notFound();
  }

  return {
    messages: (await import(`../messages/${locale}.json`)).default,
    locale: locale,
  };
});
