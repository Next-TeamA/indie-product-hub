import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

const SUPPORTED_LOCALES = ["en", "ko"] as const;
const DEFAULT_LOCALE = "en";

function detectFromAcceptLanguage(acceptLang: string | null): string {
  if (!acceptLang) return DEFAULT_LOCALE;
  // Parse first preferred language from Accept-Language header
  const preferred = acceptLang.split(",")[0].split(";")[0].trim().slice(0, 2);
  return (SUPPORTED_LOCALES as readonly string[]).includes(preferred)
    ? preferred
    : DEFAULT_LOCALE;
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;

  let locale: string;
  if (cookieLocale && (SUPPORTED_LOCALES as readonly string[]).includes(cookieLocale)) {
    locale = cookieLocale;
  } else {
    const headerStore = await headers();
    locale = detectFromAcceptLanguage(headerStore.get("accept-language"));
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
