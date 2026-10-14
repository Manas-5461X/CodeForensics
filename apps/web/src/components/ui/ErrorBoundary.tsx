import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button.js';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[CodeForensics UI ErrorBoundary]', error, errorInfo);
  }

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-surface border border-border-strong rounded-md p-6 shadow-sm text-center">
            <div className="w-12 h-12 bg-danger/10 text-danger rounded-md mx-auto flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h1 className="text-base font-semibold text-primary">An unexpected error occurred</h1>
            <p className="text-xs text-primary-secondary mt-1.5 font-mono bg-surface-subtle p-2.5 rounded border border-border-subtle text-left overflow-auto max-h-32">
              {this.state.error?.message || 'Unknown runtime error'}
            </p>
            <div className="mt-5 flex gap-2 justify-center">
              <Button
                variant="primary"
                onClick={() => window.location.reload()}
              >
                Reload application
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
