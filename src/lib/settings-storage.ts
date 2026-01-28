"use server";

import { logger } from "@/lib/logger";
import type { AppSettings } from "@/types";
import { allPreReleaseTypes } from "@/types";
import { loadGistFile, saveGistFile } from "./gist-storage";

const defaultSettings: AppSettings = {
  timeFormat: "24h",
  locale: "en",
  refreshInterval: 10,
  cacheInterval: 5,
  releasesPerPage: 30,
  parallelRepoFetches: 1,
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
const IS_BUILD = process.env.NEXT_PHASE === "phase-production-build";

let gistDisabled = false;

export async function getSettings(): Promise<AppSettings> {
  if (IS_STATIC_PHASE) return { ...defaultSettings };

  if (cachedSettings) return cachedSettings;
  if (gistDisabled) return { ...defaultSettings };

  try {
    const data = await loadGistFile<AppSettings>("settings.json");
    cachedSettings = { ...defaultSettings, ...data };
    return cachedSettings;
  } catch (err) {
    gistDisabled = true;
    logger.withScope("Settings").error("Failed to load settings from Gist:", err);
    cachedSettings = { ...defaultSettings };
    return cachedSettings;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  if (IS_BUILD) {
    cachedSettings = { ...settings };
    return;
  }

  try {
    await saveGistFile("settings.json", settings);
    cachedSettings = { ...settings };
  } catch (err) {
    logger.withScope("Settings").error("Failed to save settings to Gist:", err);
    throw new Error("Could not save settings to Gist");
  }
}
