import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/src/components/ui/button';
import { ArrowLeft, Compass } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 mb-4">
        <Compass className="w-6 h-6" />
      </div>
      <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1">
        404 — Page Not Found
      </span>
      <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">
        Route Not Found
      </h1>
      <p className="text-xs text-zinc-400 max-w-sm mt-2 mb-6">
        The requested trading route does not exist or has been relocated.
      </p>
      <Link to="/dashboard">
        <Button size="sm" variant="outline" className="gap-2 text-xs">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Dashboard</span>
        </Button>
      </Link>
    </div>
  );
}
