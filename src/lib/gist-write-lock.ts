// src/lib/gist-write-lock.ts
let locked = false;
const queue: (() => Promise<void>)[] = [];

export function withWriteLock(fn: () => Promise<void>) {
  return new Promise<void>((resolve, reject) => {
    queue.push(async () => {
      try {
        await fn();
        resolve();
      } catch (e) {
        reject(e);
      } finally {
        locked = false;
        next();
      }
    });
    next();
  });
}

function next() {
  if (locked) return;
  const job = queue.shift();
  if (!job) return;
  locked = true;
  job();
}
