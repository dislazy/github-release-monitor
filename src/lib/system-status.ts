"use server";

import { logger } from "@/lib/logger";
import type { SystemStatus } from "@/types";

const log = logger.withScope("SystemStatus");

const defaultStatus: SystemStatus = {
  latestKnownVersion: null,
  lastCheckedAt: null,
  latestEtag: null,
  dismissedVersion: null,
  lastCheckError: null,
};

/**
 * 纯内存状态（进程级）
 */
let memoryStatus: SystemStatus = { ...defaultStatus };

export async function getSystemStatus(): Promise<SystemStatus> {
  return memoryStatus;
}

export async function saveSystemStatus(status: SystemStatus): Promise<void> {
  memoryStatus = {
    ...defaultStatus,
    ...status,
  };
}

export async function updateSystemStatus(
  updater: (current: SystemStatus) => SystemStatus | Promise<SystemStatus>,
): Promise<SystemStatus> {
  const updated = await updater(memoryStatus);
  memoryStatus = {
    ...defaultStatus,
    ...updated,
  };
  return memoryStatus;
}
