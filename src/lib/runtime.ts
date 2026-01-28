/**
 * 判断当前是否处于 next build 阶段
 */
export const IS_BUILD_TIME =
  process.env.NEXT_PHASE === "phase-production-build";
