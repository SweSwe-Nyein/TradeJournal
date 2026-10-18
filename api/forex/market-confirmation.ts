import type { Request, Response } from 'express';
import {
  getLatestMarketConfirmation,
  collectForexMarketData,
  getTwelveDataApiKey,
} from '../../src/lib/forex/twelve-data-service';

export default async function handler(req: Request, res: Response) {
  try {
    const data = await getLatestMarketConfirmation();
    const apiKey = getTwelveDataApiKey();

    if (data.pairs.length === 0 && apiKey && !data.isCollecting) {
      collectForexMarketData().catch((err) =>
        console.warn('Vercel initial collection warning:', err)
      );
    }

    res.status(200).json({
      ...data,
      hasApiKey: Boolean(apiKey),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error in market confirmation API';
    res.status(500).json({ error: message });
  }
}
