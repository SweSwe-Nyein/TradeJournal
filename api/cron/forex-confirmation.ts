import type { Request, Response } from 'express';
import { collectForexMarketData, getTwelveDataApiKey } from '../../src/lib/forex/twelve-data-service';

export default async function handler(req: Request, res: Response) {
  const configuredSecret = process.env.CRON_SECRET;

  if (configuredSecret) {
    const headerSecret = req.headers['x-cron-secret'];
    const authHeader = req.headers.authorization;
    const bearerSecret = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (headerSecret !== configuredSecret && bearerSecret !== configuredSecret) {
      return res.status(401).json({ error: 'Unauthorized cron request' });
    }
  }

  const apiKey = getTwelveDataApiKey();
  if (!apiKey) {
    return res.status(400).json({ error: 'TWELVE_DATA_API_KEY is not set' });
  }

  try {
    const result = await collectForexMarketData();
    res.status(200).json({
      success: result.success,
      message: result.message,
      updatedCount: result.updatedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Cron execution failed';
    res.status(500).json({ error: message });
  }
}
