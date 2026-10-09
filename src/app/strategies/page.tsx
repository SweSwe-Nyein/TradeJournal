import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/src/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { useAuth } from '@/src/hooks/useAuth';
import { StrategyService } from '@/src/lib/services/strategy-service';
import { TagService } from '@/src/lib/services/tag-service';
import { MistakeService } from '@/src/lib/services/mistake-service';
import { AnalyticsService } from '@/src/lib/services/analytics-service';
import type { Strategy, Tag, Mistake, CategoricalPerformanceMetrics } from '@/src/types/journal-metadata';
import { StrategyFormDialog } from '@/src/components/strategies/strategy-form-dialog';
import { DeleteStrategyDialog } from '@/src/components/strategies/delete-strategy-dialog';
import { formatCurrency } from '@/src/lib/formatting/currency';
import {
  Target,
  Plus,
  Pencil,
  Trash2,
  Tag as TagIcon,
  AlertTriangle,
  Layers,
  Sparkles,
  TrendingUp,
  Activity,
  CheckCircle2,
  Database,
  ArrowRight,
} from 'lucide-react';
import { DatabaseSetupModal } from '@/src/components/database/database-setup-modal';
import { checkDatabaseStatus, type DatabaseStatus } from '@/src/lib/supabase/db-status';

export function StrategiesPage() {
  const { user } = useAuth();
  const userId = user?.id || 'demo-user-id';

  // Navigation Tabs: 'strategies' | 'tags' | 'mistakes'
  const [activeTab, setActiveTab] = useState<'strategies' | 'tags' | 'mistakes'>('strategies');

  // Database setup check
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [isDbSetupOpen, setIsDbSetupOpen] = useState(false);

  // Strategy State
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [strategyMetrics, setStrategyMetrics] = useState<Map<string, CategoricalPerformanceMetrics>>(new Map());
  const [isLoadingStrategies, setIsLoadingStrategies] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [strategyToEdit, setStrategyToEdit] = useState<Strategy | null>(null);
  const [strategyToDelete, setStrategyToDelete] = useState<Strategy | null>(null);

  // Check DB status on mount
  const checkDb = useCallback(async () => {
    const status = await checkDatabaseStatus();
    setDbStatus(status);
  }, []);

  useEffect(() => {
    checkDb();
  }, [checkDb]);

  // Tag State
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [tagMetrics, setTagMetrics] = useState<Map<string, CategoricalPerformanceMetrics>>(new Map());
  const [isSubmittingTag, setIsSubmittingTag] = useState(false);

  // Mistake State
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [newMistakeName, setNewMistakeName] = useState('');
  const [mistakeMetrics, setMistakeMetrics] = useState<Map<string, CategoricalPerformanceMetrics>>(new Map());
  const [isSubmittingMistake, setIsSubmittingMistake] = useState(false);

  // Load Strategies & Metrics
  const loadStrategies = useCallback(async () => {
    if (!userId) return;
    setIsLoadingStrategies(true);
    try {
      const [listRes, perfRes] = await Promise.all([
        StrategyService.listStrategies(userId),
        AnalyticsService.getPerformanceByStrategy(userId),
      ]);
      setStrategies(listRes.data || []);

      const metricsMap = new Map<string, CategoricalPerformanceMetrics>();
      if (perfRes.data) {
        perfRes.data.forEach((m) => metricsMap.set(m.id, m));
      }
      setStrategyMetrics(metricsMap);
    } finally {
      setIsLoadingStrategies(false);
    }
  }, [userId]);

  // Load Tags & Metrics
  const loadTags = useCallback(async () => {
    if (!userId) return;
    const [tagRes, tagPerf] = await Promise.all([
      TagService.listTags(userId),
      AnalyticsService.getPerformanceByTag(userId),
    ]);
    setTags(tagRes.data || []);
    const metricsMap = new Map<string, CategoricalPerformanceMetrics>();
    if (tagPerf.data) {
      tagPerf.data.forEach((m) => metricsMap.set(m.id, m));
    }
    setTagMetrics(metricsMap);
  }, [userId]);

  // Load Mistakes & Metrics
  const loadMistakes = useCallback(async () => {
    if (!userId) return;
    const [mRes, mPerf] = await Promise.all([
      MistakeService.listMistakes(userId),
      AnalyticsService.getPerformanceByMistake(userId),
    ]);
    setMistakes(mRes.data || []);
    const metricsMap = new Map<string, CategoricalPerformanceMetrics>();
    if (mPerf.data) {
      mPerf.data.forEach((m) => metricsMap.set(m.id, m));
    }
    setMistakeMetrics(metricsMap);
  }, [userId]);

  useEffect(() => {
    loadStrategies();
    loadTags();
    loadMistakes();
  }, [loadStrategies, loadTags, loadMistakes]);

  // Strategy Operations
  const handleCreateOrUpdateStrategy = async (data: { name: string; description?: string | null }) => {
    if (!userId) return { error: new Error('User required') };
    if (strategyToEdit) {
      const res = await StrategyService.updateStrategy(userId, strategyToEdit.id, data);
      if (!res.error) {
        setStrategyToEdit(null);
        await loadStrategies();
      }
      return { error: res.error };
    } else {
      const res = await StrategyService.createStrategy(userId, data);
      if (!res.error) {
        setIsCreateOpen(false);
        await loadStrategies();
      }
      return { error: res.error };
    }
  };

  const handleDeleteStrategy = async (id: string) => {
    if (!userId) return { success: false, error: new Error('User required') };
    const res = await StrategyService.deleteStrategy(userId, id);
    if (res.success) {
      await loadStrategies();
    }
    return res;
  };

  const handleSeedDefaultStrategies = async () => {
    if (!userId) return;
    await StrategyService.seedDefaultStrategies(userId);
    await loadStrategies();
  };

  // Tag Operations
  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !newTagName.trim()) return;
    setIsSubmittingTag(true);
    const res = await TagService.createTag(userId, newTagName.trim());
    setIsSubmittingTag(false);
    if (res.data) {
      setNewTagName('');
      await loadTags();
    }
  };

  const handleDeleteTag = async (id: string) => {
    if (!userId) return;
    await TagService.deleteTag(userId, id);
    await loadTags();
  };

  // Mistake Operations
  const handleAddMistake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !newMistakeName.trim()) return;
    setIsSubmittingMistake(true);
    const res = await MistakeService.createMistake(userId, newMistakeName.trim());
    setIsSubmittingMistake(false);
    if (res.data) {
      setNewMistakeName('');
      await loadMistakes();
    }
  };

  const handleDeleteMistake = async (id: string) => {
    if (!userId) return;
    await MistakeService.deleteMistake(userId, id);
    await loadMistakes();
  };

  return (
    <div className="space-y-6 max-w-6xl pb-12">
      <PageHeader
        category="Playbook"
        title="Strategy & Playbook Center"
        description="Formalize your edge: execution rules, entry triggers, tags, and psychological mistakes."
        actions={
          <div className="flex items-center gap-2">
            {activeTab === 'strategies' && (
              <Button
                size="sm"
                onClick={() => {
                  setStrategyToEdit(null);
                  setIsCreateOpen(true);
                }}
                className="gap-2 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Strategy</span>
              </Button>
            )}
          </div>
        }
      />

      {/* Database Setup Alert if tables not yet created in Supabase */}
      {dbStatus && (!dbStatus.strategiesTableExists || !dbStatus.tagsTableExists || !dbStatus.mistakesTableExists) && (
        <div className="p-3.5 rounded-lg bg-amber-950/60 border border-amber-800/80 text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <p className="font-semibold text-amber-100">Database Tables Not Initialized Yet</p>
              <p className="text-[11px] text-amber-300">
                To store your strategies, execution tags, and mistakes in PostgreSQL, run the migration in your Supabase SQL Editor.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setIsDbSetupOpen(true)}
            className="h-7 text-xs bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold gap-1 shrink-0"
          >
            <span>Initialize Tables</span>
            <ArrowRight className="w-3 h-3" />
          </Button>
        </div>
      )}

      {/* Playbook Navigation Switcher */}
      <div className="flex border-b border-zinc-850 gap-4 text-xs font-mono">
        <button
          type="button"
          onClick={() => setActiveTab('strategies')}
          className={`pb-2.5 px-1 border-b-2 font-medium flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'strategies'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>Strategies ({strategies.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tags')}
          className={`pb-2.5 px-1 border-b-2 font-medium flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'tags'
              ? 'border-sky-500 text-sky-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <TagIcon className="w-3.5 h-3.5" />
          <span>Execution Tags ({tags.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('mistakes')}
          className={`pb-2.5 px-1 border-b-2 font-medium flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'mistakes'
              ? 'border-rose-500 text-rose-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Mistake Catalog ({mistakes.length})</span>
        </button>
      </div>

      {/* TAB 1: STRATEGIES LIST */}
      {activeTab === 'strategies' && (
        <div className="space-y-4">
          {isLoadingStrategies ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse h-44 bg-zinc-900/40" />
              ))}
            </div>
          ) : strategies.length === 0 ? (
            <Card className="p-8 text-center bg-zinc-900/30 border-dashed border-zinc-800">
              <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 mx-auto mb-3">
                <Target className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-zinc-100">No Strategies Defined</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto mt-1 mb-4 leading-relaxed font-sans">
                Create a formal playbook setup to tag trades, evaluate win rates, and verify your statistical edge.
              </p>
              <div className="flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSeedDefaultStrategies}
                  className="text-xs gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Add Recommended Starters</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setStrategyToEdit(null);
                    setIsCreateOpen(true);
                  }}
                  className="text-xs gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Custom Strategy</span>
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {strategies.map((strat) => {
                const metrics = strategyMetrics.get(strat.id);
                const tradesCount = metrics?.totalTrades ?? 0;
                const winRate = metrics?.winRate ?? 0;
                const netPnl = metrics?.netPnl ?? 0;
                const pFactor = metrics?.profitFactor ?? 0;
                const isPos = netPnl > 0;
                const isNeg = netPnl < 0;

                return (
                  <Card
                    key={strat.id}
                    className="hover:border-zinc-750 transition-all flex flex-col justify-between group bg-zinc-900/40"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="w-8 h-8 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 shrink-0">
                          <Target className="w-4 h-4" />
                        </div>
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => {
                              setStrategyToEdit(strat);
                              setIsCreateOpen(true);
                            }}
                            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 cursor-pointer"
                            title="Edit Strategy"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setStrategyToDelete(strat)}
                            className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 cursor-pointer"
                            title="Delete Strategy"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <CardTitle className="text-sm font-semibold text-zinc-100 mt-2 font-sans">
                        {strat.name}
                      </CardTitle>
                      {strat.description ? (
                        <p className="text-xs text-zinc-400 line-clamp-2 mt-1 leading-relaxed font-sans">
                          {strat.description}
                        </p>
                      ) : (
                        <p className="text-xs text-zinc-600 italic mt-1 font-sans">
                          No description provided.
                        </p>
                      )}
                    </CardHeader>

                    {/* Stats Footer */}
                    <CardContent className="pt-2 border-t border-zinc-850/80 font-mono text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-zinc-400">
                        <span>Trades Executed:</span>
                        <span className="tabular-nums font-semibold text-zinc-200">
                          {tradesCount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-zinc-400">
                        <span>Win Rate:</span>
                        <span className="tabular-nums font-semibold text-zinc-200">
                          {tradesCount > 0 ? `${winRate.toFixed(1)}%` : '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-zinc-400">
                        <span>Net P&amp;L:</span>
                        <span
                          className={`tabular-nums font-semibold ${
                            isPos
                              ? 'text-emerald-400'
                              : isNeg
                              ? 'text-rose-400'
                              : 'text-zinc-200'
                          }`}
                        >
                          {tradesCount > 0
                            ? formatCurrency(netPnl, { showSign: true })
                            : '$0.00'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-0.5">
                        <span>Profit Factor:</span>
                        <span className="tabular-nums">
                          {tradesCount > 0 ? pFactor.toFixed(2) : '—'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: EXECUTION TAGS */}
      {activeTab === 'tags' && (
        <div className="space-y-6">
          {/* Add Tag Inline Form */}
          <Card className="bg-zinc-900/40">
            <CardContent className="p-4">
              <form onSubmit={handleAddTag} className="flex flex-col sm:flex-row gap-3 items-end sm:items-end">
                <div className="w-full sm:flex-1 space-y-1">
                  <label className="text-xs font-medium text-zinc-300 font-sans">
                    Create New Execution Tag
                  </label>
                  <Input
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="e.g. A+, Reversal, London Session, High Conviction"
                    className="text-xs font-mono"
                  />
                </div>
                <Button type="submit" size="sm" disabled={isSubmittingTag || !newTagName.trim()} className="gap-1.5 text-xs h-9">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Tag</span>
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Tags Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {tags.map((tag) => {
              const metrics = tagMetrics.get(tag.id);
              const count = metrics?.totalTrades ?? 0;
              const net = metrics?.netPnl ?? 0;

              return (
                <div
                  key={tag.id}
                  className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 transition-colors flex items-center justify-between gap-2"
                >
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-xs font-mono font-medium text-sky-300 block truncate">
                      #{tag.name}
                    </span>
                    <span className="text-[11px] font-mono text-zinc-500 block">
                      {count} trades · {formatCurrency(net, { showSign: true })}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteTag(tag.id)}
                    className="text-zinc-500 hover:text-rose-400 p-1 rounded transition-colors"
                    title="Delete Tag"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: MISTAKE CATALOG */}
      {activeTab === 'mistakes' && (
        <div className="space-y-6">
          {/* Add Mistake Inline Form */}
          <Card className="bg-zinc-900/40">
            <CardContent className="p-4">
              <form onSubmit={handleAddMistake} className="flex flex-col sm:flex-row gap-3 items-end sm:items-end">
                <div className="w-full sm:flex-1 space-y-1">
                  <label className="text-xs font-medium text-zinc-300 font-sans">
                    Record New Execution Mistake Pattern
                  </label>
                  <Input
                    value={newMistakeName}
                    onChange={(e) => setNewMistakeName(e.target.value)}
                    placeholder="e.g. FOMO / Chased, Moved Stop Loss, Revenge Trade, Oversized"
                    className="text-xs font-mono"
                  />
                </div>
                <Button type="submit" size="sm" disabled={isSubmittingMistake || !newMistakeName.trim()} className="gap-1.5 text-xs h-9">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Mistake</span>
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Mistakes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {mistakes.map((m) => {
              const metrics = mistakeMetrics.get(m.id);
              const count = metrics?.totalTrades ?? 0;
              const net = metrics?.netPnl ?? 0;

              return (
                <div
                  key={m.id}
                  className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 transition-colors flex items-center justify-between gap-2"
                >
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-xs font-mono font-medium text-rose-300 block truncate flex items-center gap-1">
                      <span>⚠️</span>
                      <span>{m.name}</span>
                    </span>
                    <span className="text-[11px] font-mono text-zinc-500 block">
                      {count} logged · Cost: {formatCurrency(net, { showSign: true })}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteMistake(m.id)}
                    className="text-zinc-500 hover:text-rose-400 p-1 rounded transition-colors"
                    title="Delete Mistake"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dialogs */}
      <StrategyFormDialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) setStrategyToEdit(null);
        }}
        strategyToEdit={strategyToEdit}
        onSubmit={handleCreateOrUpdateStrategy}
      />

      <DeleteStrategyDialog
        open={Boolean(strategyToDelete)}
        onOpenChange={(open) => {
          if (!open) setStrategyToDelete(null);
        }}
        strategy={strategyToDelete}
        onConfirm={handleDeleteStrategy}
      />

      <DatabaseSetupModal
        open={isDbSetupOpen}
        onOpenChange={setIsDbSetupOpen}
        onVerified={() => {
          checkDb();
          loadStrategies();
          loadTags();
          loadMistakes();
        }}
      />
    </div>
  );
}
