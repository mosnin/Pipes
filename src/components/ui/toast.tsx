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
        // The pane, not the viewport: the rail is 240 wide, so the pane's
        // centre is 120px right of the window's. `--nav-w` is the rail,
        // and `--rail-w` is a different thing entirely.
        className="pointer-events-none fixed inset-x-0 bottom-8 z-[300] flex justify-center max-[900px]:ps-0 ps-[var(--nav-w)]"
        aria-live="polite"
      >
        {toast ? (
          <div
            key={toast.id}
            className={cnToast()}
            // Rises and fades; it does not scale, because it is not an object
            // the pointer opened.
          >
            <span className="t-body text-inverse">{toast.message}</span>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss"
              className="focus-ring -me-1 grid size-6 place-items-center rounded-6 text-inverse/70 transition-colors hover:text-inverse"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}

function cnToast(): string {
  return [
    "pointer-events-auto flex h-[44px] items-center gap-3 rounded-8 bg-ink px-4",
    "shadow-elev-3",
    "animate-in fade-in-0 slide-in-from-bottom-2",
    "duration-[var(--dur-3)] ease-[var(--ease-emphasis)]",
  ].join(" ");
}
