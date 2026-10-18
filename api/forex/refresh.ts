import type { Request, Response } from 'express';
import {
  getLatestMarketConfirmation,
  collectForexMarketData,
  getTwelveDataApiKey,
} from '../../src/lib/forex/twelve-data-service';

export default async function handler(req: Request, res: Response) {
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
    const confirmationData = await getLatestMarketConfirmation();

    res.status(200).json({
      success: result.success,
      message: result.message,
      updatedCount: result.updatedCount,
      timestamp: new Date().toISOString(),
      data: confirmationData,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Manual refresh failed';
    res.status(500).json({ success: false, error: message });
  }
}
