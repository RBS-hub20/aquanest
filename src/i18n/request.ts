import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export const LOCALES = ["en", "tl"] as const;
export type Locale = (typeof LOCALES)[number];
export const LOCALE_COOKIE = "NEXT_LOCALE";

export default getRequestConfig(async () => {
  const raw = cookies().get(LOCALE_COOKIE)?.value;
  const locale: Locale = raw === "tl" ? "tl" : "en";
  return {
    locale,
    timeZone: "Asia/Manila",
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
