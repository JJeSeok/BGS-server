import nodeCron from 'node-cron';
import * as pwResetRepository from '../data/passwordReset.js';

const GRACE_MINUTES = 5;
const KEEP_USED_DAYS = 7;

const minutesAgo = (m) => new Date(Date.now() - m * 60 * 1000);
const daysAgo = (d) => new Date(Date.now() - d * 24 * 60 * 60 * 1000);

export async function cleanupOnce() {
  const now = new Date();
  const graceCutoff = minutesAgo(GRACE_MINUTES);
  const usedCutoff = daysAgo(KEEP_USED_DAYS);

  const deleted = await pwResetRepository.remove(graceCutoff, now, usedCutoff);
  console.log(`[cleanup] deleted=${deleted} at ${now}`);
  return deleted;
}

export function scheduleCleanup() {
  nodeCron.schedule('*/10 * * * *', () => {
    cleanupOnce().catch((err) => console.error('[cleanup] failed:', err));
  });
}
