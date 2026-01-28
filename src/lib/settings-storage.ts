"use server";

import { logger } from "@/lib/logger";
import type { AppSettings, Locale } from "@/types";
import { allPreReleaseTypes } from "@/types";
import { defaultLocale, locales } from "@/i18n/routing";
import { loadGistFile, saveGistFile } from "./gist-storage";

// =======================
// 默认设置
// =======================
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

// =======================
// 内存缓存
// =======================
let cachedSettings: AppSettings | null = null;
let lastCacheCheck = 0;
const CACHE_CHECK_INTERVAL_MS = 500;

// 深度 clone，防止外部修改
function cloneSettings(settings: AppSettings): AppSettings {
  return {
    ...settings,
    releaseChannels: [...settings.releaseChannels],
    preReleaseSubChannels: settings.preReleaseSubChannels
      ? [...settings.preReleaseSubChannels]
      : undefined,
  };
}

// =======================
// 判断是否在 build 阶段
// Next.js 在 build 阶段会定义环境变量
// 也可用 process.env.NEXT_PHASE 或 process.env.NEXT_PUBLIC_xxx
// =======================
const IS_BUILD = process.env.NEXT_PHASE === "phase-production-build";

// =======================
// 刷新缓存
// =======================
async function refreshCache(): Promise<void> {
  if (IS_BUILD) {
    // 构建阶段直接使用默认值，不访问网络
    cachedSettings = cloneSettings(defaultSettings);
    lastCacheCheck = Date.now();
    return;
  }

  try {
    const data = (await loadGistFile<AppSettings>("settings.json")) ?? {};
    cachedSettings = cloneSettings({ ...defaultSettings, ...data });
  } catch (error) {
    logger.withScope("Settings").error("Failed to load settings from Gist:", error);
    cachedSettings = cloneSettings(defaultSettings);
  }
  lastCacheCheck = Date.now();
}

// =======================
// 确保缓存有效
// =======================
async function ensureCache(): Promise<void> {
  if (!cachedSettings) {
    await refreshCache();
    return;
  }

  const now = Date.now();
  if (now - lastCacheCheck >= CACHE_CHECK_INTERVAL_MS) {
    await refreshCache();
  }
}

// =======================
// 对外接口
// =======================
export async function getSettings(): Promise<AppSettings> {
  await ensureCache();
  if (!cachedSettings) throw new Error("Settings cache is unavailable");
  return cloneSettings(cachedSettings);
}

export async function getLocaleSetting(): Promise<Locale> {
  await ensureCache();
  const locale = cachedSettings?.locale;
  return locale && (locales as readonly string[]).includes(locale)
    ? (locale as Locale)
    : defaultLocale;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  if (IS_BUILD) {
    // 构建阶段禁止写 Gist
    cachedSettings = cloneSettings({ ...defaultSettings, ...settings });
    lastCacheCheck = Date.now();
    logger.withScope("Settings").info(
      "saveSettings skipped during build phase, cached locally only"
    );
    return;
  }

  try {
    await saveGistFile("settings.json", { ...defaultSettings, ...settings });
    cachedSettings = cloneSettings({ ...defaultSettings, ...settings });
    lastCacheCheck = Date.now();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.withScope("Settings").error("Failed to save settings to Gist:", error);
    throw new Error(`Could not save settings data: ${message}`);
  }
}

// =======================
// 测试辅助
// =======================
export async function __clearSettingsCacheForTests__(): Promise<void> {
  cachedSettings = null;
  lastCacheCheck = 0;
}
