"use server";

import { logger } from "@/lib/logger";
import type { Repository } from "@/types";
import { loadGistFile, saveGistFile } from "./gist-storage";

let cachedRepositories: Repository[] | null = null;
const IS_BUILD = process.env.NEXT_PHASE === "phase-production-build";

export async function getRepositories(): Promise<Repository[]> {
  if (IS_BUILD) {
    if (!cachedRepositories) cachedRepositories = [];
    return cachedRepositories;
  }

  if (cachedRepositories) return cachedRepositories;

  try {
    const data = (await loadGistFile<Repository[]>("repositories.json")) ?? [];
    cachedRepositories = data;
    return data;
  } catch (err) {
    logger.withScope("Repositories").error("Failed to load repositories from Gist:", err);
    cachedRepositories = [];
    return [];
  }
}

export async function saveRepositories(repositories: Repository[]): Promise<void> {
  if (IS_BUILD) {
    cachedRepositories = [...repositories];
    return;
  }

  try {
    await saveGistFile("repositories.json", repositories);
    cachedRepositories = [...repositories];
  } catch (err) {
    logger.withScope("Repositories").error("Failed to save repositories to Gist:", err);
    throw new Error("Could not save repositories to Gist");
  }
}
