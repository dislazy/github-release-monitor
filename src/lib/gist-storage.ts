"use server";

import fetch from "node-fetch";
import { logger } from "@/lib/logger";

const GITHUB_TOKEN = process.env.GITHUB_ACCESS_TOKEN;
const GIST_ID = process.env.GIST_ID;

// 内存缓存
const cache: Record<string, { content: any; timestamp: number }> = {};
const CACHE_TTL_MS = 30_000; // 30 秒缓存，减少 API 调用

const IS_BUILD = process.env.NEXT_PHASE === "phase-production-build";

if (!GITHUB_TOKEN || !GIST_ID) {
  logger.withScope("Gist").warn(
    "GITHUB_ACCESS_TOKEN or GIST_ID not set. Runtime Gist access will fail."
  );
}

// 读取 Gist 文件
export async function loadGistFile<T>(filename: string): Promise<T | null> {
  if (IS_BUILD) return null; // 构建阶段不访问 Gist
  if (!GITHUB_TOKEN || !GIST_ID) return null;

  const cached = cache[filename];
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.content as T;
  }

  try {
    const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
    });
    if (!res.ok) throw new Error(`Failed to fetch Gist: ${res.status}`);

    const gist = await res.json();
    const fileContent = gist.files[filename]?.content;
    const parsed: T | null = fileContent ? JSON.parse(fileContent) : null;

    cache[filename] = { content: parsed, timestamp: now };
    return parsed;
  } catch (err) {
    logger.withScope("Gist").error("loadGistFile failed:", err);
    return null;
  }
}

// 写入 Gist 文件
export async function saveGistFile(filename: string, data: unknown) {
  if (IS_BUILD) return; // 构建阶段不写
  if (!GITHUB_TOKEN || !GIST_ID) {
    throw new Error("GITHUB_TOKEN and GIST_ID must be set to save Gist");
  }

  try {
    await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      method: "PATCH",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
      body: JSON.stringify({
        files: { [filename]: { content: JSON.stringify(data, null, 2) } },
      }),
    });

    // 更新内存缓存
    cache[filename] = { content: data, timestamp: Date.now() };
  } catch (err) {
    logger.withScope("Gist").error("saveGistFile failed:", err);
    throw err;
  }
}
