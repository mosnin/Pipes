"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui";

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
      <div className="flex items-center justify-center w-full h-full min-h-[280px] surface-subtle">
        <div className="bg-white border border-black/[0.08] rounded-[12px] shadow-md-token max-w-md w-full mx-4 p-6 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-red-50 inline-flex items-center justify-center">
            <AlertTriangle className="text-red-600" size={22} />
          </div>
          <div>
            <h3 className="t-h3 font-semibold text-[#111]">{this.props.area} crashed</h3>
            <p className="t-label text-[#3C3C43] mt-1">
              Something went wrong rendering this surface. Reload the panel to retry.
            </p>
            {this.state.message && (
              <p className="t-caption text-[#8E8E93] mt-2 break-words">{this.state.message}</p>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Button
              variant="primary"
              size="sm"
              onPress={() => {
                this.setState({ hasError: false, message: undefined });
                this.props.onRecover?.();
              }}
            >
              Reload panel
            </Button>
            <a
              href="mailto:support@pipes.ai"
              className="t-label text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              Report issue
            </a>
          </div>
        </div>
      </div>
    );
  }
}
