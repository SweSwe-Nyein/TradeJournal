import * as React from 'react';
import { cn } from '@/src/lib/utils';

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  category?: string;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  category,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 pb-6 border-b border-zinc-850 md:flex-row md:items-end md:justify-between',
        className
      )}
    >
      <div className="space-y-1">
        {category && (
          <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-zinc-500">
            <span>TradeJournal</span>
            <span aria-hidden="true" className="text-zinc-600">/</span>
            <span className="text-zinc-400">{category}</span>
          </div>
        )}
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-zinc-100">
          {title}
        </h1>
        {description && (
          <p className="text-xs md:text-sm text-zinc-400 max-w-2xl text-balance">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 shrink-0 pt-2 md:pt-0">
          {actions}
        </div>
      )}
    </div>
  );
}
