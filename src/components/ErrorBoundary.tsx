import { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Indian Bakery UI boundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF5EE] text-[#3B2314] flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-[#FFFDF9] border border-[#E6DDD1] rounded-2xl p-6 text-center space-y-4 shadow-sm">
            <h1 className="font-display text-2xl font-semibold text-[#3B2314]">
              Indian Bakery &amp; Cafe
            </h1>
            <p className="text-sm text-[#6D4C3D] leading-relaxed">
              Something unexpected interrupted the storefront view. Tap below to reload cleanly.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 bg-[#C45512] hover:bg-[#A9450C] text-white text-sm font-medium rounded-xl cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload Storefront</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
