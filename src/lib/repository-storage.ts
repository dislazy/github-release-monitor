"use server";

import { logger } from "@/lib/logger";
import type { Repository } from "@/types";
import { loadGistFile, saveGistFile } from "./gist-storage";

// 内存缓存，防止频繁 GET
let cachedRepositories: Repository[] | null = null;
let lastCacheCheck = 0;
const CACHE_CHECK_INTERVAL_MS = 500;

// 深度 clone 防止外部修改
function cloneRepositories(repos: Repository[]): Repository[] {
  return repos.map(r => ({ ...r }));
}

// 刷新内存缓存
async function refreshCache(): Promise<void> {
  try {
    const data = (await loadGistFile<Repository[]>("repositories.json")) ?? [];
    cachedRepositories = cloneRepositories(data);
  } catch (error) {
    logger.withScope("Repositories").error("Failed to load repositories from Gist:", error);
    cachedRepositories = [];
  }
  lastCacheCheck = Date.now();
}

// 确保缓存有效
async function ensureCache(): Promise<void> {
  if (!cachedRepositories) {
    await refreshCache();
    return;
  }
  const now = Date.now();
  if (now - lastCacheCheck >= CACHE_CHECK_INTERVAL_MS) {
    await refreshCache();
  }
}

// 对外接口：获取所有 repo
export async function getRepositories(): Promise<Repository[]> {
  await ensureCache();
  return cachedRepositories ? cloneRepositories(cachedRepositories) : [];
}

// 对外接口：保存所有 repo
export async function saveRepositories(repositories: Repository[]): Promise<void> {
  try {
    await saveGistFile("repositories.json", repositories);
    cachedRepositories = cloneRepositories(repositories);
    lastCacheCheck = Date.now();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.withScope("Repositories").error("Failed to save repositories to Gist:", error);
    throw new Error(`Failed to save repositories data: ${message}`);
  }
}

// 对测试暴露：清除缓存
export async function __clearRepositoriesCacheForTests__(): Promise<void> {
  cachedRepositories = null;
  lastCacheCheck = 0;
}
