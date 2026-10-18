import { Router, type Request, type Response } from 'express';
import {
  getLatestMarketConfirmation,
  collectForexMarketData,
  getTwelveDataApiKey,
} from '../lib/forex/twelve-data-service';
import { getCurrentSessionInfo } from '../lib/forex/forex-calculations';

export const forexRouter = Router();

/**
 * Validates request authorization for scheduled collection endpoints.
 */
function isAuthorizedCron(req: Request): boolean {
  const configuredSecret = process.env.CRON_SECRET;

  if (configuredSecret) {
    const headerSecret = req.headers['x-cron-secret'];
    const authHeader = req.headers.authorization;
    const bearerSecret = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (headerSecret === configuredSecret || bearerSecret === configuredSecret) {
      return true;
    }
    return false;
  }

  return true;
}

/**
 * GET /api/forex/market-confirmation
 * Returns latest stored market confirmation table data.
 */
forexRouter.get('/market-confirmation', async (req: Request, res: Response) => {
  try {
    const data = await getLatestMarketConfirmation();
    const apiKey = getTwelveDataApiKey();

    res.json({
      ...data,
      hasApiKey: Boolean(apiKey),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve market confirmation data';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/forex/refresh
 * Dedicated endpoint for manual user-triggered market data collection.
 * Fetches fresh candles from Twelve Data, recalculates metrics for all 8 pairs,
 * saves to Supabase, and returns the updated records and response status.
 */
forexRouter.post('/refresh', async (req: Request, res: Response) => {
  const apiKey = getTwelveDataApiKey();
  if (!apiKey) {
    return res.status(400).json({
      success: false,
      error: 'TWELVE_DATA_API_KEY environment variable is not configured on the server.',
    });
  }

  try {
    const forceDaily = req.query.forceDaily === 'true' || req.body?.forceDaily === true;
    const result = await collectForexMarketData({ forceRefreshDaily: forceDaily });

    // Retrieve fresh combined market confirmation response
    const confirmationData = await getLatestMarketConfirmation();

    res.json({
      success: result.success,
      message: result.message,
      updatedCount: result.updatedCount,
      timestamp: new Date().toISOString(),
      currentSession: getCurrentSessionInfo().description,
      data: confirmationData,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Forex data collection failed';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/forex/collect or POST /api/cron/forex-confirmation
 * Secured cron endpoint.
 */
forexRouter.post('/collect', async (req: Request, res: Response) => {
  if (!isAuthorizedCron(req)) {
    return res.status(401).json({
      error: 'Unauthorized. Valid x-cron-secret or Authorization Bearer header is required.',
    });
  }

  const apiKey = getTwelveDataApiKey();
  if (!apiKey) {
    return res.status(400).json({
      error: 'TWELVE_DATA_API_KEY environment variable is not configured on the server.',
    });
  }

  try {
    const forceDaily = req.query.forceDaily === 'true' || req.body?.forceDaily === true;
    const result = await collectForexMarketData({ forceRefreshDaily: forceDaily });
    const confirmationData = await getLatestMarketConfirmation();

    res.json({
      success: result.success,
      message: result.message,
      updatedCount: result.updatedCount,
      timestamp: new Date().toISOString(),
      currentSession: getCurrentSessionInfo().description,
      data: confirmationData,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Forex data collection failed';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/cron/forex-confirmation
 */
forexRouter.get('/forex-confirmation', async (req: Request, res: Response) => {
  if (!isAuthorizedCron(req)) {
    return res.status(401).json({
      error: 'Unauthorized. Valid x-cron-secret or Authorization Bearer header is required.',
    });
  }

  const apiKey = getTwelveDataApiKey();
  if (!apiKey) {
    return res.status(400).json({
      error: 'TWELVE_DATA_API_KEY environment variable is not configured on the server.',
    });
  }

  try {
    const result = await collectForexMarketData();
    res.json({
      success: result.success,
      message: result.message,
      updatedCount: result.updatedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Cron collection failed';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/forex/status
 */
forexRouter.get('/status', (req: Request, res: Response) => {
  const apiKey = getTwelveDataApiKey();
  const sessionInfo = getCurrentSessionInfo();

  res.json({
    status: 'ok',
    hasApiKey: Boolean(apiKey),
    hasCronSecret: Boolean(process.env.CRON_SECRET),
    activeSessions: sessionInfo.activeSessions,
    sessionDescription: sessionInfo.description,
    isLondonOrNyActive: sessionInfo.isLondonOrNyActive,
    serverUtcTime: new Date().toISOString(),
  });
});
