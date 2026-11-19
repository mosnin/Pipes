import type { ReactNode } from "react";
import { StatusPill } from "@/components/ledger/status";
import type { RunStatus } from "@/domain/runs/types";
import { STATUS_LABEL, STATUS_ROLE } from "@/components/runs/run-format";

/** A run's state, in the product's six-role vocabulary. Never interactive. */
export function RunStatusPill({ status, className }: { status: RunStatus; className?: string }): ReactNode {
  return (
    <StatusPill role={STATUS_ROLE[status] ?? "neutral"} className={className}>
      {STATUS_LABEL[status] ?? status}
    </StatusPill>
  );
}
