import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen w-full bg-[#090a0f] text-white p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shadow-lg shadow-rose-950/50">
            <AlertTriangle className="w-7 h-7 text-rose-400" />
          </div>
          <div className="max-w-md space-y-2">
            <h2 className="text-lg font-bold text-white">
              {this.props.fallbackTitle || 'Niečo sa pokazilo (Something went wrong)'}
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {this.state.error?.message || 'Nastala neočakávaná chyba pri vykresľovaní aplikácie.'}
            </p>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 rounded-xl glass-button text-xs font-semibold text-zinc-300 border-white/10 hover:bg-white/10"
            >
              Skúsiť znova
            </button>
            <button
              onClick={this.handleReload}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 text-zinc-950 text-xs font-bold shadow-lg shadow-cyan-950/60 hover:bg-cyan-400 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Obnoviť stránku</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
