"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button, EmptyState } from "@/components/ui";

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
    if (process.env.NODE_ENV !== "development") {
      Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
    }
    // keep existing console.error for dev
    if (process.env.NODE_ENV === "development") {
      console.error("[ErrorBoundary]", error, info);
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
        <EmptyState
          icon="✈️"
          title={fr ? "Oups, quelque chose a mal tourné" : "Oops, something went wrong"}
          description={
            fr
              ? "Une erreur inattendue s'est produite. Réessayez ou lancez une nouvelle recherche."
              : "An unexpected error occurred. Try again or start a new search."
          }
          action={
            <Button type="button" variant="secondary" onClick={this.handleReset} className="mt-2">
              {fr ? "Réessayer" : "Try again"}
            </Button>
          }
        />
      );
    }

    return this.props.children;
  }
}
