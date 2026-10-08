import * as React from 'react';
import { cn } from '@/src/lib/utils';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors cursor-pointer select-none',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-zinc-100 text-zinc-950 hover:bg-zinc-200 shadow-sm active:bg-zinc-300':
              variant === 'default',
            'bg-red-900/60 text-red-200 border border-red-800/60 hover:bg-red-900/80 active:bg-red-950':
              variant === 'destructive',
            'border border-zinc-800 bg-zinc-900/60 text-zinc-200 hover:bg-zinc-800 hover:text-white':
              variant === 'outline',
            'bg-zinc-800 text-zinc-100 hover:bg-zinc-700':
              variant === 'secondary',
            'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60':
              variant === 'ghost',
            'text-zinc-300 underline-offset-4 hover:underline':
              variant === 'link',
            'h-9 px-4 py-2': size === 'default',
            'h-8 rounded-md px-3 text-xs': size === 'sm',
            'h-10 rounded-md px-6 text-base': size === 'lg',
            'h-9 w-9 p-0': size === 'icon',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
