// src/lib/gist-storage.ts
import { getCache, setCache, clearCache } from "./gist-cache";
import { withWriteLock } from "./gist-write-lock";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN!;
const GIST_ID = process.env.GIST_ID!;

if (!GITHUB_TOKEN || !GIST_ID) {
  throw new Error("GITHUB_TOKEN and GIST_ID must be set");
}

const API = "https://api.github.com";
const GIST_CACHE_KEY = "GIST_FULL";
const GIST_TTL = 60_000; // 60 秒（安全值）

async function request(method: string, path: string, body?: any) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status}: ${text}`);
  }
  return res.json();
}

/**
 * 只在缓存失效时 GET 一次 Gist
 */
async function loadWholeGist() {
  const cached = getCache(GIST_CACHE_KEY);
  if (cached) return cached;

  const data = await request("GET", `/gists/${GIST_ID}`);
  setCache(GIST_CACHE_KEY, data, GIST_TTL);
  return data;
}

/**
 * 读取 Gist 中的某个 JSON 文件
 */
export async function loadGistFile<T = any>(file: string): Promise<T | null> {
  try {
    const gist = await loadWholeGist();
    const content = gist.files?.[file]?.content;
    if (!content) return null;
    return JSON.parse(content);
  } catch (e) {
    console.warn("[gist] read failed, fallback to cache only", e);
    return getCache(`FILE_${file}`);
  }
}

/**
 * 写入某个文件（串行 + 清缓存）
 */
export async function saveGistFile(file: string, data: any) {
  const content = JSON.stringify(data, null, 2);

  await withWriteLock(async () => {
    await request("PATCH", `/gists/${GIST_ID}`, {
      files: {
        [file]: { content },
      },
    });

    // 写成功后，清理缓存，防脏读
    clearCache(GIST_CACHE_KEY);
    setCache(`FILE_${file}`, data, GIST_TTL);
  });
}
