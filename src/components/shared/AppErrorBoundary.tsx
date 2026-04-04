import { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorPanel } from "@/components/shared/ErrorPanel";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false
  };

  static getDerivedStateFromError() {
    return {
      hasError: true
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Unhandled React error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="container py-12">
          <ErrorPanel
            message="A UI error interrupted the current screen. Reload to restore the latest live feed and route state."
            onRetry={() => window.location.reload()}
            title="The interface hit an unexpected error"
          />
        </main>
      );
    }

    return this.props.children;
  }
}
