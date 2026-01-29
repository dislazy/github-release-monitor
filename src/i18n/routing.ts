import { defineRouting, type Pathnames } from "next-intl/routing";

export const locales = ["en", "de", "zh"] as const;
export const defaultLocale = "zh" as const;

// Centralized pathnames for the app (no side-effects)
export const pathnames = {
  "/": {
    en: "/",
    de: "/",
    zh: "/"
  },
  "/settings": {
    en: "/settings",
    de: "/einstellungen",
    zh: "/settings"
  },
  "/login": {
    en: "/login",
    de: "/anmelden",
    zh: "/login"
  },
  "/test": {
    en: "/test",
    de: "/test",
    zh: "/test"
  },
} satisfies Pathnames<typeof locales>;

export const routing = defineRouting({
  locales,
  defaultLocale,
  pathnames,
});
