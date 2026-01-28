"use server";
import { logger } from "@/lib/logger";
import type { Repository } from "@/types";
import { loadGistFile, saveGistFile } from "./gist-storage";

let cachedRepositories: Repository[] | null = null;
let lastCacheCheck = 0;
const CACHE_CHECK_INTERVAL_MS = 500;

const IS_BUILD = process.env.NEXT_PHASE === "phase-production-build";

function cloneRepositories(repos: Repository[]): Repository[] {
  return repos.map((r) => ({ ...r }));
}

async function refreshCache() {
  if (IS_BUILD) {
    cachedRepositories = [];
    lastCacheCheck = Date.now();
    return;
  }

  try {
    const data = (await loadGistFile<Repository[]>("repositories.json")) ?? [];
    cachedRepositories = cloneRepositories(data);
  } catch (err) {
    logger.withScope("Repositories").error("Failed to load from Gist:", err);
    cachedRepositories = [];
  }
  lastCacheCheck = Date.now();
}

async function ensureCache() {
  if (!cachedRepositories) await refreshCache();
  else if (Date.now() - lastCacheCheck > CACHE_CHECK_INTERVAL_MS) await refreshCache();
}

export async function getRepositories(): Promise<Repository[]> {
  await ensureCache();
  return cachedRepositories ?? [];
}

export async function saveRepositories(repositories: Repository[]): Promise<void> {
  if (IS_BUILD) {
    cachedRepositories = cloneRepositories(repositories);
    lastCacheCheck = Date.now();
    return;
  }

  try {
    await saveGistFile("repositories.json", repositories);
    cachedRepositories = cloneRepositories(repositories);
    lastCacheCheck = Date.now();
  } catch (err) {
    logger.withScope("Repositories").error("Failed to save to Gist:", err);
    throw new Error("Failed to save repositories to Gist");
  }
}
