import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/src/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, TrendingUp, TrendingDown, Award, BookOpen } from 'lucide-react';
import { useAuth } from '@/src/hooks/useAuth';
import { TradeService } from '@/src/lib/services/trade-service';
import type { TradeWithAccount } from '@/src/types/trade';

function getLocalTradingDate(dateString: string, timezone: string = 'UTC'): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString.split('T')[0] || '';
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(date);
    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;
    if (year && month && day) {
      return `${year}-${month}-${day}`;
    }
  } catch {
    // fallback
  }
  return dateString.split('T')[0] || '';
}

export function CalendarPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [trades, setTrades] = useState<TradeWithAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Current calendar view date (defaulting to current year/month)
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

  const userTimezone = profile?.timezone || 'UTC';

  useEffect(() => {
    async function loadTrades() {
      if (!user) return;
      setLoading(true);
      const { data } = await TradeService.getTrades(user.id, { limit: 2000 });
      setTrades(data || []);
      setLoading(false);
    }
    loadTrades();
  }, [user]);

  // Year and month for calendar
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-11

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleCurrentMonth = () => {
    setCurrentDate(new Date());
  };

  // Aggregate trades by local calendar date string 'YYYY-MM-DD'
  const dailyStats = useMemo(() => {
    const map = new Map<string, { pnl: number; count: number; wins: number; losses: number; trades: TradeWithAccount[] }>();

    for (const trade of trades) {
      const timeStr = trade.exit_time || trade.entry_time;
      if (!timeStr) continue;
      const localDate = getLocalTradingDate(timeStr, userTimezone);
      if (!localDate) continue;

      let entry = map.get(localDate);
      if (!entry) {
        entry = { pnl: 0, count: 0, wins: 0, losses: 0, trades: [] };
        map.set(localDate, entry);
      }

      const pnl = Number(trade.net_pnl) || 0;
      entry.pnl += pnl;
      entry.count += 1;
      entry.trades.push(trade);
      if (pnl > 0) entry.wins += 1;
      else if (pnl < 0) entry.losses += 1;
    }

    return map;
  }, [trades, userTimezone]);

  // Generate calendar grid days for the month
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) to 6 (Sat)
    const totalDaysInMonth = lastDayOfMonth.getDate();

    const days = [];

    // Previous month trailing days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const d = new Date(year, month - 1, dayNum);
      const dateStr = d.toISOString().split('T')[0];
      days.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const d = new Date(year, month, i);
      const yearStr = d.getFullYear();
      const monthStr = String(d.getMonth() + 1).padStart(2, '0');
      const dayStr = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yearStr}-${monthStr}-${dayStr}`;
      days.push({
        dateStr,
        dayNum: i,
        isCurrentMonth: true,
      });
    }

    // Next month leading days to complete week grid (multiple of 7)
    const remainingCells = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remainingCells; i++) {
      const d = new Date(year, month + 1, i);
      const yearStr = d.getFullYear();
      const monthStr = String(d.getMonth() + 1).padStart(2, '0');
      const dayStr = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yearStr}-${monthStr}-${dayStr}`;
      days.push({
        dateStr,
        dayNum: i,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [year, month]);

  // Monthly summary metrics
  const monthlySummary = useMemo(() => {
    let totalPnl = 0;
    let totalTrades = 0;
    let winDays = 0;
    let lossDays = 0;
    let flatDays = 0;

    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    for (const [dateStr, stats] of dailyStats.entries()) {
      if (dateStr.startsWith(prefix)) {
        totalPnl += stats.pnl;
        totalTrades += stats.count;
        if (stats.pnl > 0) winDays++;
        else if (stats.pnl < 0) lossDays++;
        else flatDays++;
      }
    }

    return { totalPnl, totalTrades, winDays, lossDays, flatDays };
  }, [dailyStats, year, month]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6">
      <PageHeader
        category="Analytics"
        title="Trading Calendar"
        description={`Monthly P&L heat-map and daily performance respecting your timezone (${userTimezone}).`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrevMonth} className="h-8 w-8 p-0">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleCurrentMonth} className="text-xs font-mono px-3 h-8">
              Today
            </Button>
            <span className="text-xs font-mono font-medium text-zinc-200 px-2 min-w-[130px] text-center">
              {monthNames[month]} {year}
            </span>
            <Button variant="outline" size="sm" onClick={handleNextMonth} className="h-8 w-8 p-0">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        }
      />

      {/* Monthly Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-850">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-zinc-400">Monthly Net P&L</p>
              <p className={`text-lg font-mono font-bold mt-1 ${monthlySummary.totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {monthlySummary.totalPnl >= 0 ? '+' : ''}${monthlySummary.totalPnl.toFixed(2)}
              </p>
            </div>
            <div className={`p-2.5 rounded-lg ${monthlySummary.totalPnl >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
              {monthlySummary.totalPnl >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-850">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-zinc-400">Total Trades</p>
              <p className="text-lg font-mono font-bold text-zinc-200 mt-1">{monthlySummary.totalTrades}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Award className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-850">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-zinc-400">Profitable Days</p>
              <p className="text-lg font-mono font-bold text-emerald-400 mt-1">{monthlySummary.winDays} Days</p>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-850">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-zinc-400">Losing Days</p>
              <p className="text-lg font-mono font-bold text-rose-400 mt-1">{monthlySummary.lossDays} Days</p>
            </div>
            <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-400">
              <TrendingDown className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Grid */}
      <Card className="border-zinc-850">
        <CardHeader className="pb-3 border-b border-zinc-850">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-indigo-400" />
              <span>Performance Heat-map</span>
            </CardTitle>
            <div className="flex items-center gap-4 text-xs font-mono text-zinc-400">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Profitable</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Losing</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-zinc-600" /> Break-even</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-zinc-800" /> No Trades</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {/* Days Header */}
          <div className="grid grid-cols-7 gap-2 mb-2 text-center text-[11px] font-mono font-medium text-zinc-400 uppercase tracking-wider">
            {daysOfWeek.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Days Matrix */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((cell) => {
              const stats = dailyStats.get(cell.dateStr);
              const hasTrades = stats && stats.count > 0;
              const pnl = stats ? stats.pnl : 0;

              let bgClass = 'bg-zinc-900/20 border-zinc-850 text-zinc-400';
              let badgeColor = 'text-zinc-500';

              if (!cell.isCurrentMonth) {
                bgClass = 'bg-zinc-950/40 border-zinc-900/60 text-zinc-600';
              } else if (hasTrades) {
                if (pnl > 0) {
                  bgClass = 'bg-emerald-950/20 border-emerald-900/40 hover:border-emerald-700/60 text-zinc-100 cursor-pointer shadow-sm';
                  badgeColor = 'text-emerald-400 font-semibold';
                } else if (pnl < 0) {
                  bgClass = 'bg-rose-950/20 border-rose-900/40 hover:border-rose-700/60 text-zinc-100 cursor-pointer shadow-sm';
                  badgeColor = 'text-rose-400 font-semibold';
                } else {
                  bgClass = 'bg-zinc-850/40 border-zinc-750 hover:border-zinc-600 text-zinc-100 cursor-pointer shadow-sm';
                  badgeColor = 'text-zinc-300 font-semibold';
                }
              } else {
                bgClass = 'bg-zinc-900/40 border-zinc-850/80 hover:border-zinc-700 text-zinc-300 cursor-pointer';
              }

              return (
                <div
                  key={cell.dateStr}
                  onClick={() => navigate(`/journal/${cell.dateStr}`)}
                  className={`min-h-[95px] p-2.5 rounded-lg border transition-all flex flex-col justify-between group relative ${bgClass}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-mono font-medium ${cell.isCurrentMonth ? 'text-zinc-200' : 'text-zinc-600'}`}>
                      {cell.dayNum}
                    </span>
                    {hasTrades && (
                      <span className="text-[10px] font-mono bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded-full">
                        {stats.count} {stats.count === 1 ? 'trade' : 'trades'}
                      </span>
                    )}
                  </div>

                  <div className="text-right space-y-0.5 mt-2">
                    {hasTrades ? (
                      <>
                        <div className={`text-xs font-mono ${badgeColor}`}>
                          {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                        </div>
                        <div className="text-[10px] font-mono text-zinc-400 flex items-center justify-end gap-1">
                          <span className="text-emerald-400">{stats.wins}W</span>
                          <span>/</span>
                          <span className="text-rose-400">{stats.losses}L</span>
                        </div>
                      </>
                    ) : (
                      <span className="text-[11px] font-mono text-zinc-600 group-hover:text-zinc-400">
                        No trades
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
