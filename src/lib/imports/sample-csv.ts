export const SAMPLE_CSV_CONTENT = `Symbol,Side,Entry Time,Exit Time,Entry Price,Exit Price,Quantity,Stop Loss,Take Profit,Commission,Fees,Swap,Risk ($),Notes
NQ,BUY,2026-10-06 09:30:15,2026-10-06 09:48:22,18520.50,18565.75,2,18495.00,18570.00,4.50,1.20,0.00,51.00,"Opening Range Breakout, clean momentum push"
ES,SELL,2026-10-06 10:15:00,2026-10-06 10:42:30,5812.25,5798.50,1,5820.00,5790.00,2.50,0.85,0.00,38.75,"VWAP rejection, scaled out near daily low"
AAPL,BUY,2026-10-06 11:00:00,2026-10-06 11:35:10,228.40,225.10,50,225.00,235.00,1.50,0.40,0.00,170.00,"Key level breakdown, stopped out with discipline"
NVDA,SHORT,2026-10-06 13:10:45,2026-10-06 14:05:00,124.80,121.20,100,126.50,120.00,2.00,0.60,0.00,170.00,"Gap-fill continuation, covered at target"
BTCUSDT,BUY,2026-10-06 15:20:00,2026-10-06 16:50:00,64250.00,65100.00,0.5,63800.00,66000.00,5.00,1.50,0.00,225.00,"Bull flag breakout on 15m volume expansion"`;

export function downloadSampleCsvFile(filename: string = 'sample_trades.csv') {
  const blob = new Blob([SAMPLE_CSV_CONTENT], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
