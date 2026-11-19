import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";

/**
 * What an operator page shows when the API refuses the caller. The server's
 * own message is the body, so the reason is never paraphrased away.
 */
export function OperatorGate({ error }: { error: string }) {
  return (
    <Card>
      <EmptyState variant="permission" title="Operator access required" body={error} className="py-8" />
    </Card>
  );
}
