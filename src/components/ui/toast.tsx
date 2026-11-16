"use client";

/**
 * The confirmation pill, measured off `order-fulfilled` — see
 * `docs/SHOPIFY_MEASUREMENTS.md`. 44 high, `#1a1a1a`, content-width, and
 * centred on the *pane's* centre rather than the viewport's: at 1920 it sits
 * at x=959.5, which is 755.6 @1512 — the same axis the top bar's search field
 * and both modal widths centre on.
 *
 * It states what happened, in the past tense, and carries a × because the
 * reference's does. It is not a notification centre and it takes no actions.
 */
import { X } from "@/components/ui/icon";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Toast = { id: number; message: string };

const ToastContext = createContext<((message: string) => void) | null>(null);

/** Announce a completed action. Returns a no-op outside the provider. */
export function useToast(): (message: string) => void {
  return useContext(ToastContext) ?? noop;
}
function noop() {}

/** The reference shows one at a time, and a second replaces the first. */
export function ToastProvider({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setToast(null);
  }, []);

  const show = useCallback((message: string) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: Date.now(), message });
    timer.current = setTimeout(() => setToast(null), 5000);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        // Podium: toasts are pills in the bottom right, centred on phones.
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[300] flex justify-center sm:inset-x-auto sm:right-5 sm:bottom-5 sm:justify-end"
        aria-live="polite"
      >
        {toast ? (
          <div
            key={toast.id}
            className={cnToast()}
            // Rises and fades; it does not scale, because it is not an object
            // the pointer opened.
          >
            <span className="text-[14px] font-medium tracking-[-0.005em] text-foreground">{toast.message}</span>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss"
              className="focus-ring -me-1 grid size-6 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}

function cnToast(): string {
  return [
    "t-toast pointer-events-auto flex h-11 items-center gap-2 rounded-full bg-card pl-4 pr-2.5",
    "shadow-float dark:shadow-[0_0_0_1px_var(--line-border),0_12px_32px_-8px_rgb(0_0_0/0.5)]",
  ].join(" ");
}
