"use server";

import { cookies } from "next/headers";

const SUPPORTED_LOCALES = ["en", "ko"];

export async function setLocale(locale: string) {
  if (!SUPPORTED_LOCALES.includes(locale)) return;
  const store = await cookies();
  store.set("NEXT_LOCALE", locale, {
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: "/",
  });
}
