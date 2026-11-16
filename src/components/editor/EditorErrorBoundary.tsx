"use client";

import React from "react";
import { Button } from "@/components/ui/button";

type Props = { area: string; onRecover?: () => void; children: React.ReactNode; onCrash?: (area: string, message: string) => void };
type State = { hasError: boolean; message?: string };

export class EditorErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error) {
    this.props.onCrash?.(this.props.area, error.message);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div role="alert" className="flex h-full min-h-[160px] flex-col items-start justify-center gap-2 px-4 py-4">
        <div className="flex flex-col gap-0.5">
          <p className="t-body-strong text-ink">{this.props.area} is temporarily unavailable.</p>
          <p className="t-caption text-ink-3">Reload this panel, or go back to the dashboard.</p>
        </div>
        <div className="flex flex-wrap gap-1">
          <Button size="sm" variant="secondary" onClick={() => { this.setState({ hasError: false, message: undefined }); this.props.onRecover?.(); }}>Reload panel</Button>
          <Button size="sm" variant="ghost" onClick={() => { window.location.href = "/dashboard"; }}>Back to dashboard</Button>
        </div>
      </div>
    );
  }
}
