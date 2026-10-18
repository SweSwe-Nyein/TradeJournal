/**
 * Forex Scheduler (Disabled in favor of manual "Refresh Market Data" collection)
 *
 * Automatic cron and background intervals have been removed per configuration.
 * Market data collection is triggered manually via the "Refresh Market Data"
 * button on the Forex Confirmation Table (/api/forex/refresh).
 */

let schedulerInterval: NodeJS.Timeout | null = null;

export function startForexScheduler(): void {
  // Automatic background timer is disabled.
  console.log('[Forex Scheduler] Automatic cron scheduler is disabled. Use manual "Refresh Market Data" to collect.');
}

export function stopForexScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}
