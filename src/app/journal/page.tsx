import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/src/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { BookOpen, Plus, Calendar, Smile, Frown, Meh, Star, ArrowRight, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/src/hooks/useAuth';
import { JournalService, type JournalEntry } from '@/src/lib/services/journal-service';

export function JournalPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    async function loadJournal() {
      if (!user) return;
      setLoading(true);
      const { data } = await JournalService.listJournalEntries(user.id);
      setEntries(data || []);
      setLoading(false);
    }
    loadJournal();
  }, [user]);

  const getMoodIcon = (mood: string | null) => {
    switch (mood) {
      case 'Excellent':
      case 'Good':
        return <Smile className="w-4 h-4 text-emerald-400" />;
      case 'Neutral':
        return <Meh className="w-4 h-4 text-amber-400" />;
      case 'Bad':
      case 'Terrible':
        return <Frown className="w-4 h-4 text-rose-400" />;
      default:
        return <Smile className="w-4 h-4 text-zinc-400" />;
    }
  };

  const getMoodBadgeColor = (mood: string | null) => {
    switch (mood) {
      case 'Excellent':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Good':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Neutral':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Bad':
      case 'Terrible':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        category="Playbook"
        title="Trading Journal"
        description="Daily market observations, emotional state tracking, execution discipline, and psychological insights."
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/calendar')}
              className="gap-2 text-xs"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Calendar View</span>
            </Button>
            <Button
              size="sm"
              onClick={() => navigate(`/journal/${todayStr}`)}
              className="gap-2 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Today's Review</span>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Entries List */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
              Recent Journal Entries ({entries.length})
            </span>
          </div>

          {loading ? (
            <Card className="bg-zinc-900/50 border-zinc-850">
              <CardContent className="p-6 text-center text-xs font-mono text-zinc-400">
                Loading journal entries...
              </CardContent>
            </Card>
          ) : entries.length === 0 ? (
            <Card className="bg-zinc-900/50 border-zinc-850">
              <CardContent className="p-6 text-center">
                <BookOpen className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
                <p className="text-xs font-medium text-zinc-300">No journal logs found</p>
                <p className="text-[11px] text-zinc-500 mt-1 mb-4">
                  Start journaling your daily trades and mindset to uncover psychological edges.
                </p>
                <Button
                  size="sm"
                  onClick={() => navigate(`/journal/${todayStr}`)}
                  className="w-full text-xs"
                >
                  Create First Entry
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2.5 max-h-[650px] overflow-y-auto pr-1">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => navigate(`/journal/${entry.date}`)}
                  className="p-3.5 rounded-lg border border-zinc-850 bg-zinc-900/40 hover:bg-zinc-900 hover:border-zinc-750 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-mono font-medium text-zinc-200">
                      {entry.date}
                    </span>
                    {entry.mood && (
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1 ${getMoodBadgeColor(entry.mood)}`}>
                        {getMoodIcon(entry.mood)}
                        <span>{entry.mood}</span>
                      </span>
                    )}
                  </div>

                  {entry.title && (
                    <h4 className="text-xs font-semibold text-zinc-100 group-hover:text-indigo-400 transition-colors line-clamp-1 mb-1">
                      {entry.title}
                    </h4>
                  )}

                  <p className="text-[11px] text-zinc-400 line-clamp-2">
                    {entry.content}
                  </p>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-850/60 text-[10px] font-mono text-zinc-500">
                    <span>Discipline: {entry.discipline_score ? `${entry.discipline_score}/5` : 'N/A'}</span>
                    <span className="text-indigo-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      Review <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Hero / Explanatory view when no date selected */}
        <div className="lg:col-span-2">
          <Card className="border-zinc-850 bg-zinc-900/30 min-h-[460px] flex flex-col justify-center items-center text-center p-8">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-zinc-200">Daily Review & Journaling</h3>
            <p className="text-xs text-zinc-400 max-w-md mt-1.5 mb-6">
              Select a date from your calendar or recent entries list above to perform your comprehensive daily market review, track psychological discipline, and plan tomorrow's edge.
            </p>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => navigate(`/journal/${todayStr}`)}
                size="sm"
                className="gap-2 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Open Today ({todayStr})</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/calendar')}
                className="gap-2 text-xs"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>View Monthly Calendar</span>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
