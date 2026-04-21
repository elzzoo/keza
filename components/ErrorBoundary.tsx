"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  lang?: "fr" | "en";
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Silent catch — don't crash the app
    if (process.env.NODE_ENV === "development") {
      console.error("[ErrorBoundary]", error, info.componentStack);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const fr = (this.props.lang ?? "fr") === "fr";
      return (
        <div className="bg-surface rounded-2xl border border-border p-8 flex flex-col items-center gap-4 text-center">
          <span className="text-4xl">✈️</span>
          <p className="font-bold text-fg text-base">
            {fr ? "Oups, quelque chose a mal tourné" : "Oops, something went wrong"}
          </p>
          <p className="text-sm text-muted">
            {fr
              ? "Une erreur inattendue s'est produite. Réessayez ou lancez une nouvelle recherche."
              : "An unexpected error occurred. Try again or start a new search."}
          </p>
          <button
            onClick={this.handleReset}
            className="mt-2 px-5 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors"
          >
            {fr ? "Réessayer" : "Try again"}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
