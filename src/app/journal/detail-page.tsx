import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/src/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import {
  Calendar, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Award,
  BookOpen, Smile, Frown, Meh, Star, CheckCircle2, AlertTriangle, RefreshCw, Trash2, Save, ArrowLeft
} from 'lucide-react';
import { useAuth } from '@/src/hooks/useAuth';
import { TradeService } from '@/src/lib/services/trade-service';
import { JournalService, type JournalEntry } from '@/src/lib/services/journal-service';
import { useTradingAccounts } from '@/src/hooks/useTradingAccounts';
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

export function JournalDetailPage() {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { accounts } = useTradingAccounts();

  const userTimezone = profile?.timezone || 'UTC';
  const currentDateStr = date || new Date().toISOString().split('T')[0];

  const [trades, setTrades] = useState<TradeWithAccount[]>([]);
  const [journalEntry, setJournalEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [mood, setMood] = useState<'Excellent' | 'Good' | 'Neutral' | 'Bad' | 'Terrible' | ''>('');
  const [disciplineScore, setDisciplineScore] = useState<number | null>(3);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  useEffect(() => {
    async function loadData() {
      if (!user || !currentDateStr) return;
      setLoading(true);
      setSuccessMessage(null);
      setErrorMessage(null);

      // Load all user trades to filter for this date
      const { data: allTrades } = await TradeService.getTrades(user.id, { limit: 2000 });
      setTrades(allTrades || []);

      // Load journal entry for this date
      const { data: jEntry } = await JournalService.getJournalEntryByDate(user.id, currentDateStr);
      setJournalEntry(jEntry);

      if (jEntry) {
        setTitle(jEntry.title || '');
        setContent(jEntry.content || '');
        setMood(jEntry.mood || '');
        setDisciplineScore(jEntry.discipline_score ?? 3);
        setSelectedAccountId(jEntry.trading_account_id || '');
      } else {
        setTitle(`Daily Review - ${currentDateStr}`);
        setContent('');
        setMood('Good');
        setDisciplineScore(4);
        setSelectedAccountId('');
      }

      setLoading(false);
    }
    loadData();
  }, [user, currentDateStr]);

  // Filter trades for the selected calendar date
  const dayTrades = useMemo(() => {
    return trades.filter((t) => {
      const timeStr = t.exit_time || t.entry_time;
      if (!timeStr) return false;
      return getLocalTradingDate(timeStr, userTimezone) === currentDateStr;
    });
  }, [trades, currentDateStr, userTimezone]);

  // Daily trade metrics calculation
  const dayMetrics = useMemo(() => {
    let totalPnl = 0;
    let totalFees = 0;
    let wins = 0;
    let losses = 0;
    let bestTrade: TradeWithAccount | null = null;
    let worstTrade: TradeWithAccount | null = null;

    for (const t of dayTrades) {
      const pnl = Number(t.net_pnl) || 0;
      const fees = (Number(t.commission) || 0) + (Number(t.fees) || 0) + (Number(t.swap) || 0);
      totalPnl += pnl;
      totalFees += fees;

      if (pnl > 0) wins++;
      else if (pnl < 0) losses++;

      if (!bestTrade || pnl > (Number(bestTrade.net_pnl) || 0)) {
        bestTrade = t;
      }
      if (!worstTrade || pnl < (Number(worstTrade.net_pnl) || 0)) {
        worstTrade = t;
      }
    }

    const totalClosed = wins + losses;
    const winRate = totalClosed > 0 ? (wins / totalClosed) * 100 : 0;

    return {
      totalPnl,
      totalFees,
      tradeCount: dayTrades.length,
      wins,
      losses,
      winRate,
      bestTrade,
      worstTrade,
    };
  }, [dayTrades]);

  // Date navigation helpers
  const handlePrevDay = () => {
    const d = new Date(currentDateStr);
    d.setDate(d.getDate() - 1);
    navigate(`/journal/${d.toISOString().split('T')[0]}`);
  };

  const handleNextDay = () => {
    const d = new Date(currentDateStr);
    d.setDate(d.getDate() + 1);
    navigate(`/journal/${d.toISOString().split('T')[0]}`);
  };

  // Save / Upsert journal entry
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const { data, error } = await JournalService.upsertJournalEntry(user.id, {
      date: currentDateStr,
      title: title.trim() || null,
      content: content.trim() || 'No detailed notes provided.',
      mood: mood || null,
      discipline_score: disciplineScore,
      trading_account_id: selectedAccountId || null,
    });

    setSaving(false);
    if (error) {
      setErrorMessage(error.message);
    } else {
      setJournalEntry(data);
      setSuccessMessage('Journal entry saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  // Delete journal entry
  const handleDelete = async () => {
    if (!user || !journalEntry) return;
    if (!window.confirm('Are you sure you want to delete this journal entry?')) return;

    setSaving(true);
    const { error } = await JournalService.deleteJournalEntry(user.id, journalEntry.id);
    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
    } else {
      setJournalEntry(null);
      setContent('');
      setTitle(`Daily Review - ${currentDateStr}`);
      setSuccessMessage('Journal entry deleted.');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const moods = ['Excellent', 'Good', 'Neutral', 'Bad', 'Terrible'] as const;

  return (
    <div className="space-y-6">
      <PageHeader
        category="Daily Review"
        title={`Review for ${currentDateStr}`}
        description={`Market performance and psychological journal log respecting timezone (${userTimezone}).`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/journal')}
              className="gap-1.5 text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Journal</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevDay}
              className="h-8 w-8 p-0"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextDay}
              className="h-8 w-8 p-0"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        }
      />

      {successMessage && (
        <div className="p-3 bg-emerald-950/30 border border-emerald-900/50 rounded-lg text-xs font-mono text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-950/30 border border-rose-900/50 rounded-lg text-xs font-mono text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Day Performance KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-850">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-zinc-400">Net P&L</p>
              <p className={`text-lg font-mono font-bold mt-1 ${dayMetrics.totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {dayMetrics.totalPnl >= 0 ? '+' : ''}${dayMetrics.totalPnl.toFixed(2)}
              </p>
            </div>
            <div className={`p-2.5 rounded-lg ${dayMetrics.totalPnl >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
              {dayMetrics.totalPnl >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-850">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-zinc-400">Trade Count & Win Rate</p>
              <p className="text-lg font-mono font-bold text-zinc-200 mt-1">
                {dayMetrics.tradeCount} <span className="text-xs text-zinc-400 font-normal">({dayMetrics.winRate.toFixed(0)}% win)</span>
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Award className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-850">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-zinc-400">Best Trade</p>
              <p className="text-lg font-mono font-bold text-emerald-400 mt-1">
                {dayMetrics.bestTrade ? `+$${(Number(dayMetrics.bestTrade.net_pnl) || 0).toFixed(2)}` : '$0.00'}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-850">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-zinc-400">Total Fees & Comm.</p>
              <p className="text-lg font-mono font-bold text-amber-400 mt-1">
                ${dayMetrics.totalFees.toFixed(2)}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Award className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Journal Editor Form */}
        <div className="lg:col-span-2">
          <Card className="border-zinc-850 bg-zinc-900/30">
            <CardHeader className="border-b border-zinc-850 pb-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <span>Daily Review & Journal Entry</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Reflect on your market execution, psychological discipline, and lesson plans.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSave} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-mono text-zinc-300">Journal Title</Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Clean ORB morning session"
                      className="text-xs font-mono bg-zinc-900 border-zinc-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-mono text-zinc-300">Trading Account (Optional)</Label>
                    <select
                      value={selectedAccountId}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                      className="w-full h-9 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-xs font-mono text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">All Accounts / General</option>
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.currency})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Mood Selector */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-mono text-zinc-300">Emotional State / Mood</Label>
                    <div className="flex items-center gap-1.5">
                      {moods.map((m) => (
                        <button
                          type="button"
                          key={m}
                          onClick={() => setMood(m)}
                          className={`flex-1 py-1.5 px-2 rounded text-[11px] font-mono border transition-all ${
                            mood === m
                              ? 'bg-indigo-600 border-indigo-500 text-white font-medium shadow-sm'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Discipline Score */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-mono text-zinc-300">Discipline Score (1-5)</Label>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((score) => (
                        <button
                          type="button"
                          key={score}
                          onClick={() => setDisciplineScore(score)}
                          className={`flex-1 py-1.5 rounded text-xs font-mono border transition-all flex items-center justify-center gap-1 ${
                            disciplineScore === score
                              ? 'bg-indigo-600 border-indigo-500 text-white font-semibold'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <Star className={`w-3 h-3 ${disciplineScore === score ? 'fill-white' : ''}`} />
                          <span>{score}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Structured Prompts Helper Text */}
                <div className="p-3 bg-zinc-950/60 border border-zinc-850 rounded-lg text-[11px] font-mono text-zinc-400 space-y-1">
                  <p className="font-semibold text-zinc-300">Guided Review Prompts:</p>
                  <p>• <span className="text-zinc-300">Market / Trade Review:</span> What did I trade? What worked? What didn't work?</p>
                  <p>• <span className="text-zinc-300">Psychology:</span> How was my discipline? Did I follow my plan? Did I experience FOMO or revenge trade?</p>
                  <p>• <span className="text-zinc-300">Improvement:</span> What will I do differently tomorrow?</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-mono text-zinc-300">Journal Content & Observations</Label>
                  <textarea
                    rows={8}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write your comprehensive daily notes, strategy adherence, psychological reflections, and lessons learned..."
                    className="w-full rounded-md border border-zinc-800 bg-zinc-900 p-3 text-xs font-mono text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  {journalEntry ? (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={handleDelete}
                      disabled={saving}
                      className="gap-1.5 text-xs bg-rose-950/40 border border-rose-900/60 text-rose-300 hover:bg-rose-900/50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Entry</span>
                    </Button>
                  ) : <div />}

                  <Button
                    type="submit"
                    size="sm"
                    disabled={saving}
                    className="gap-2 text-xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{saving ? 'Saving...' : journalEntry ? 'Update Journal' : 'Save Journal'}</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right: Trade List for this Day */}
        <div className="space-y-4">
          <Card className="border-zinc-850 bg-zinc-900/30">
            <CardHeader className="border-b border-zinc-850 pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span>Trades on {currentDateStr}</span>
                <span className="text-xs font-mono bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-300">
                  {dayTrades.length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {loading ? (
                <p className="text-xs font-mono text-zinc-500 text-center py-6">Loading trades...</p>
              ) : dayTrades.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                  <p className="text-xs font-medium text-zinc-400">No trades recorded on this date</p>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Trades executed on this local calendar day will appear here automatically.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
                  {dayTrades.map((t) => {
                    const pnl = Number(t.net_pnl) || 0;
                    return (
                      <div
                        key={t.id}
                        onClick={() => navigate(`/trades/${t.id}`)}
                        className="p-3 rounded-lg border border-zinc-850 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-750 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-mono font-bold text-zinc-200 group-hover:text-indigo-400 transition-colors">
                            {t.symbol}
                          </span>
                          <span className={`text-xs font-mono font-semibold ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                          <span className="uppercase text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300">
                            {t.direction}
                          </span>
                          <span>Qty: {t.quantity}</span>
                          <span>{t.status}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
