import { getRequestConfig } from "next-intl/server";

export const LOCALES = ["en", "fr"] as const;
export const DEFAULT_LOCALE = "en";

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) || DEFAULT_LOCALE;
  return {
    messages: (await import(`../messages/${locale}.json`)).default,
    locale: locale,
  };
});
