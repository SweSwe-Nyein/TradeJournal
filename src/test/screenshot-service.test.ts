import { describe, it, expect } from 'vitest';
import { ScreenshotService } from '@/src/lib/services/screenshot-service';

describe('Screenshot Service & Storage Engine', () => {
  const userId = 'user_test_123';
  const tradeId = 'trade_test_456';

  it('lists empty screenshots initially', async () => {
    const { data, error } = await ScreenshotService.listScreenshots(userId, tradeId);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it('uploads a valid screenshot successfully in test mode', async () => {
    const dummyFile = new File(['fake-image-bytes'], 'chart.png', { type: 'image/png' });
    const { data, error } = await ScreenshotService.uploadScreenshot(userId, tradeId, dummyFile, 'Before Entry');

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data?.screenshot_type).toBe('Before Entry');
    expect(data?.storage_path).toContain(userId);
    expect(data?.storage_path).toContain(tradeId);
  });

  it('rejects invalid file MIME types', async () => {
    const invalidFile = new File(['text-content'], 'notes.txt', { type: 'text/plain' });
    const { data, error } = await ScreenshotService.uploadScreenshot(userId, tradeId, invalidFile, 'During Trade');

    expect(error).not.toBeNull();
    expect(data).toBeNull();
    expect(error?.message).toContain('Invalid file format');
  });

  it('deletes a screenshot successfully', async () => {
    const dummyFile = new File(['fake-image-bytes'], 'chart2.png', { type: 'image/png' });
    const uploadRes = await ScreenshotService.uploadScreenshot(userId, tradeId, dummyFile, 'After Exit');
    expect(uploadRes.error).toBeNull();
    const screenshotId = uploadRes.data!.id;
    const storagePath = uploadRes.data!.storage_path;

    const deleteRes = await ScreenshotService.deleteScreenshot(userId, screenshotId, storagePath, tradeId);
    expect(deleteRes.error).toBeNull();
    expect(deleteRes.success).toBe(true);

    const listRes = await ScreenshotService.listScreenshots(userId, tradeId);
    const found = listRes.data.find((s) => s.id === screenshotId);
    expect(found).toBeUndefined();
  });
});
