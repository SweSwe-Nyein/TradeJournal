import React, { useState, useEffect, useCallback } from 'react';
import { ScreenshotService, type TradeScreenshot, type ScreenshotType } from '@/src/lib/services/screenshot-service';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { Image as ImageIcon, Upload, Trash2, X, Eye, AlertCircle, CheckCircle2 } from 'lucide-react';

interface TradeScreenshotsProps {
  userId: string;
  tradeId: string;
}

const TYPES: ScreenshotType[] = ['Before Entry', 'During Trade', 'After Exit'];

export function TradeScreenshots({ userId, tradeId }: TradeScreenshotsProps) {
  const [screenshots, setScreenshots] = useState<TradeScreenshot[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<ScreenshotType>('Before Entry');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const loadScreenshots = useCallback(async () => {
    if (!userId || !tradeId) return;
    setIsLoading(true);
    const { data, error: err } = await ScreenshotService.listScreenshots(userId, tradeId);
    if (err) {
      setError(err.message);
    } else {
      setScreenshots(data || []);
    }
    setIsLoading(false);
  }, [userId, tradeId]);

  useEffect(() => {
    loadScreenshots();
  }, [loadScreenshots]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    setIsUploading(true);
    setError(null);
    setSuccessMsg(null);

    const { data, error: uploadErr } = await ScreenshotService.uploadScreenshot(userId, tradeId, file, selectedType);
    if (uploadErr) {
      setError(uploadErr.message);
    } else if (data) {
      setSuccessMsg('Screenshot uploaded successfully.');
      setScreenshots((prev) => [...prev, data]);
    }
    setIsUploading(false);
    e.target.value = '';
  };

  const handleDelete = async (screenshotId: string, storagePath: string) => {
    setError(null);
    setSuccessMsg(null);
    const res = await ScreenshotService.deleteScreenshot(userId, screenshotId, storagePath, tradeId);
    if (res.error) {
      setError(res.error.message);
    } else {
      setScreenshots((prev) => prev.filter((s) => s.id !== screenshotId));
      setSuccessMsg('Screenshot deleted.');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3 border-b border-zinc-850">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-emerald-400" />
            <CardTitle className="text-sm font-medium">Trade Screenshots &amp; Charts</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as ScreenshotType)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded px-2.5 py-1 font-mono focus:outline-none"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <div>
              <Button
                size="sm"
                className="gap-1.5 text-xs"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isUploading ? 'Uploading...' : 'Upload Image'}</span>
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>
        </div>
        <CardDescription className="text-xs">Attach screenshots for Before Entry, During Trade, or After Exit execution review.</CardDescription>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-6">
        {error && (
          <div className="p-3 bg-rose-950/30 border border-rose-900/50 rounded text-xs text-rose-400 flex items-center gap-2 font-mono">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-emerald-950/30 border border-emerald-900/50 rounded text-xs text-emerald-400 flex items-center gap-2 font-mono">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {isLoading ? (
          <div className="py-8 text-center text-xs font-mono text-zinc-500 animate-pulse">Loading screenshots...</div>
        ) : (
          <div className="space-y-6">
            {TYPES.map((category) => {
              const categoryScreenshots = screenshots.filter((s) => s.screenshot_type === category || (!s.screenshot_type && category === 'Before Entry'));
              if (categoryScreenshots.length === 0) return null;

              return (
                <div key={category} className="space-y-2">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400 border-b border-zinc-850 pb-1">
                    {category} ({categoryScreenshots.length})
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {categoryScreenshots.map((scr) => (
                      <div
                        key={scr.id}
                        className="group relative rounded-md border border-zinc-800 bg-zinc-950/60 overflow-hidden aspect-video flex items-center justify-center cursor-pointer hover:border-emerald-500/50 transition-colors"
                        onClick={() => setPreviewUrl(scr.url || null)}
                      >
                        {scr.url ? (
                          <img src={scr.url} alt={category} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-8 h-8 text-zinc-700" />
                        )}
                        
                        {/* Top-right action buttons always accessible */}
                        <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
                          <button
                            type="button"
                            title="Preview image"
                            className="h-7 w-7 rounded bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 flex items-center justify-center border border-zinc-700 shadow-md backdrop-blur-sm transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewUrl(scr.url || null);
                            }}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Delete screenshot"
                            className="h-7 w-7 rounded bg-rose-950/90 hover:bg-rose-900 text-rose-200 flex items-center justify-center border border-rose-800 shadow-md backdrop-blur-sm transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(scr.id, scr.storage_path);
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {screenshots.length === 0 && (
              <div className="py-12 border border-dashed border-zinc-850 rounded-lg text-center space-y-2">
                <ImageIcon className="w-10 h-10 text-zinc-600 mx-auto" />
                <p className="text-sm font-medium text-zinc-300">No Screenshots Attached</p>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  Upload chart screenshots (PNG, JPG, WEBP) to visually document your technical analysis, execution, and trade post-mortem.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Lightbox / Preview Modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] w-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <Button
              size="icon"
              variant="ghost"
              className="absolute -top-12 right-0 text-zinc-400 hover:text-white"
              onClick={() => setPreviewUrl(null)}
            >
              <X className="w-6 h-6" />
            </Button>
            <img src={previewUrl} alt="Screenshot Preview" className="max-w-full max-h-[85vh] object-contain rounded-md border border-zinc-800 shadow-2xl" />
          </div>
        </div>
      )}
    </Card>
  );
}
