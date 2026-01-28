"use server";

import { logger } from "@/lib/logger";
import type { AppSettings, Locale } from "@/types";
import { allPreReleaseTypes } from "@/types";
import { defaultLocale, locales } from "@/i18n/routing";

import { loadGistFile, saveGistFile } from "./gist-storage";

const CACHE_CHECK_INTERVAL_MS = 500;

const defaultSettings: AppSettings = {
  timeFormat: "24h",
  locale: "en",
  refreshInterval: 10,
  cacheInterval: 5,
  releasesPerPage: 30,
  parallelRepoFetches: Boolean(process.env.GITHUB_ACCESS_TOKEN?.trim()) ? 5 : 1,
  releaseChannels: ["stable"],
  preReleaseSubChannels: allPreReleaseTypes,
  showAcknowledge: true,
  showMarkAsNew: true,
  includeRegex: undefined,
  excludeRegex: undefined,
  appriseMaxCharacters: 1800,
  appriseTags: undefined,
  appriseFormat: "text",
};

let cachedSettings: AppSettings | null = null;
let lastCacheCheck = 0;

// 深度 clone，保持原来的语义
function cloneSettings(settings: AppSettings): AppSettings {
  return {
    ...settings,
    releaseChannels: [...settings.releaseChannels],
    preReleaseSubChannels: settings.preReleaseSubChannels
      ? [...settings.preReleaseSubChannels]
      : undefined,
  };
}

// 从 Gist 加载并刷新内存缓存
async function refreshCache(): Promise<void> {
  try {
    const data = (await loadGistFile<AppSettings>("settings.json")) ?? {};
    cachedSettings = cloneSettings({ ...defaultSettings, ...data });
  } catch (error) {
    logger.withScope("Settings").error("Failed to load settings from Gist:", error);
    cachedSettings = cloneSettings(defaultSettings);
  }
  lastCacheCheck = Date.now();
}

// 确保缓存有效
async function ensureCache(): Promise<void> {
  if (!cachedSettings) {
    await refreshCache();
    return;
  }

  const now = Date.now();
  if (now - lastCacheCheck < CACHE_CHECK_INTERVAL_MS) return;

  // 触发一次刷新（Gist 有缓存保护，1 分钟内不会重复请求）
  await refreshCache();
}

// 对外接口：获取全部设置
export async function getSettings(): Promise<AppSettings> {
  await ensureCache();
  if (!cachedSettings) throw new Error("Settings cache is unavailable");
  return cloneSettings(cachedSettings);
}

// 对外接口：获取 locale
export async function getLocaleSetting(): Promise<Locale> {
  await ensureCache();
  const locale = cachedSettings?.locale;
  return locale && (locales as readonly string[]).includes(locale)
    ? (locale as Locale)
    : defaultLocale;
}

// 对外接口：保存设置
export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    await saveGistFile("settings.json", { ...defaultSettings, ...settings });
    cachedSettings = cloneSettings({ ...defaultSettings, ...settings });
    lastCacheCheck = Date.now();
  } catch (error) {
    logger.withScope("Settings").error("Failed to save settings to Gist:", error);
    throw new Error("Could not save settings data.");
  }
}

// 对测试暴露：清除内存缓存
export async function __clearSettingsCacheForTests__(): Promise<void> {
  cachedSettings = null;
  lastCacheCheck = 0;
}
