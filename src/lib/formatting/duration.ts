/**
 * Formats duration between trade entry and exit times in human-readable trading terminal notation
 */
export function formatTradeDuration(
  entryTime: string | number | Date,
  exitTime?: string | number | Date | null
): string {
  if (!exitTime) return 'Open';

  const entryMs = new Date(entryTime).getTime();
  const exitMs = new Date(exitTime).getTime();

  if (isNaN(entryMs) || isNaN(exitMs)) return '—';

  const diffMs = exitMs - entryMs;
  if (diffMs < 0) return '—';

  const totalSeconds = Math.floor(diffMs / 1000);
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const totalMinutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  if (totalMinutes < 60) {
    return remainingSeconds > 0 ? `${totalMinutes}m ${remainingSeconds}s` : `${totalMinutes}m`;
  }

  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  if (totalHours < 24) {
    return remainingMinutes > 0 ? `${totalHours}h ${remainingMinutes}m` : `${totalHours}h`;
  }

  const totalDays = Math.floor(totalHours / 24);
  const remainingHours = totalHours % 24;

  return remainingHours > 0 ? `${totalDays}d ${remainingHours}h` : `${totalDays}d`;
}
