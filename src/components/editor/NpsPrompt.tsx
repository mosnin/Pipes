"use client";

// One-question NPS toast. Fires once per user, after the third successful
// agent build completion. Renders as a Sonner toast at top-right with a tiny
// inline form: a 0-10 number input, an optional note, Send and Skip.
//
// The parent decides when to mount this component. Mounting triggers the
// toast; the `onDismiss` prop fires on send, skip, Esc, or click-outside,
// and writes the seen flag to localStorage so we never ask again.

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button, Input, Textarea } from "@/components/ui";
import { sendFeedback } from "@/lib/feedback/client";
import { setNpsSeen } from "@/lib/feedback/storage";

export type NpsPromptProps = {
  // Called once the prompt has been answered, skipped, or dismissed. Always
  // marks the user's localStorage flag before invoking.
  onDismiss: () => void;
};

const TOAST_ID = "looper-nps-prompt";

export function NpsPrompt({ onDismiss }: NpsPromptProps) {
  const firedRef = useRef(false);

  const finalize = useCallback(() => {
    setNpsSeen();
    toast.dismiss(TOAST_ID);
    onDismiss();
  }, [onDismiss]);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;

    toast.custom(
      () => <NpsToastBody onClose={finalize} />,
      {
        id: TOAST_ID,
        duration: Infinity,
        position: "top-right",
        dismissible: true,
        onDismiss: () => {
          setNpsSeen();
          onDismiss();
        },
        onAutoClose: () => {
          setNpsSeen();
          onDismiss();
        },
      },
    );

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finalize();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [finalize, onDismiss]);

  return null;
}

function NpsToastBody({ onClose }: { onClose: () => void }) {
  const [score, setScore] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);

  const submit = useCallback(async () => {
    const n = Number(score);
    if (!Number.isFinite(n)) return;
    const clamped = Math.max(0, Math.min(10, Math.round(n)));
    setSending(true);
    void sendFeedback({ kind: "nps", score: clamped, note: note.trim() || undefined });
    onClose();
  }, [score, note, onClose]);

  return (
    <div className="bg-white border border-black/[0.08] shadow-md-token rounded-2xl p-3 w-[300px] flex flex-col gap-2">
      <p className="t-label text-[#111] font-medium">
        How likely are you to recommend Looper?
      </p>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          max={10}
          inputMode="numeric"
          aria-label="0-10"
          placeholder="0-10"
          value={score}
          onChange={(e) => setScore(e.target.value)}
          className="w-16"
        />
        <span className="t-caption text-[#8E8E93]">0 = no, 10 = yes</span>
      </div>
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Anything else?"
        rows={2}
        className="text-sm"
      />
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={onClose} isDisabled={sending}>Skip</Button>
        <Button
          variant="primary"
          size="sm"
          onClick={submit}
          isDisabled={sending || score.trim() === ""}
        >
          Send
        </Button>
      </div>
    </div>
  );
}
