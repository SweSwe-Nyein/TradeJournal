import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/src/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in TradeJournal component tree:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-lg bg-red-950/60 border border-red-800/80 flex items-center justify-center text-red-400 mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-semibold text-zinc-100">
            Runtime Application Error
          </h2>
          <p className="text-xs text-zinc-400 max-w-md mt-1 mb-4 font-mono">
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={this.handleReset}
            className="gap-2 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload Application</span>
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
