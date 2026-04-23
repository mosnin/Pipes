"use client";

import React from "react";
import { Button, Card } from "@/components/ui";

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
      <Card>
        <p><strong>{this.props.area} is temporarily unavailable.</strong></p>
        <p>Please reload this surface or return to dashboard.</p>
        <div className="nav-inline">
          <Button onClick={() => { this.setState({ hasError: false, message: undefined }); this.props.onRecover?.(); }}>Reload panel</Button>
          <Button onClick={() => { window.location.href = "/dashboard"; }}>Back to dashboard</Button>
        </div>
      </Card>
    );
  }
}
