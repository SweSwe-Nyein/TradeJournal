import { collectForexMarketData, getTwelveDataApiKey } from '../lib/forex/twelve-data-service';
import { getCurrentSessionInfo } from '../lib/forex/forex-calculations';

let schedulerInterval: NodeJS.Timeout | null = null;

/**
 * Initializes the background 15-minute scheduler.
 * Runs automatically during active London and New York sessions (including overlap).
 * Respects Twelve Data quotas and avoids overlapping runs.
 */
export function startForexScheduler(): void {
  if (schedulerInterval) {
    return; // Already started
  }

  const intervalMs = 30 * 60 * 1000; // 30 minutes

  console.log('[Forex Scheduler] Initialized background 30-minute market confirmation timer.');

  // Perform initial collection on startup if within trading hours and API key is present
  setTimeout(async () => {
    const apiKey = getTwelveDataApiKey();
    if (!apiKey) {
      console.log('[Forex Scheduler] TWELVE_DATA_API_KEY not configured. Background timer idle.');
      return;
    }

    const session = getCurrentSessionInfo();
    console.log(`[Forex Scheduler] Current session state: ${session.description} (Active: ${session.isLondonOrNyActive})`);

    // Trigger collection if active or on startup to seed initial data
    try {
      console.log('[Forex Scheduler] Triggering initial startup market data collection...');
      const res = await collectForexMarketData();
      console.log(`[Forex Scheduler] Initial collection complete: ${res.message}`);
    } catch (err) {
      console.warn('[Forex Scheduler] Initial collection skipped or failed:', err);
    }
  }, 3000);

  // Set recurring interval
  schedulerInterval = setInterval(async () => {
    const apiKey = getTwelveDataApiKey();
    if (!apiKey) return;

    const session = getCurrentSessionInfo();

    // Only fetch during London and New York sessions to minimize API requests
    if (!session.isLondonOrNyActive) {
      console.log(`[Forex Scheduler] Outside active London/NY trading window (${session.description}). Skipping cycle.`);
      return;
    }

    console.log(`[Forex Scheduler] Running scheduled 30-minute collection during ${session.description}...`);
    try {
      const result = await collectForexMarketData();
      console.log(`[Forex Scheduler] Cycle result: ${result.message} at ${new Date().toISOString()}`);
    } catch (err) {
      console.error('[Forex Scheduler] Error during scheduled collection:', err);
    }
  }, intervalMs);
}

/**
 * Stops the scheduler (useful in tests).
 */
export function stopForexScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[Forex Scheduler] Stopped.');
  }
}
