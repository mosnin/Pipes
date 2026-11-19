"use client";

/**
 * Toasts. The one way Podium shows a toast is Ding (@yusufceng1z/ding-react):
 * spring-physics pills that morph in place. Import `toast` from here, never
 * from the package directly, and never build a toast stack by hand.
 *
 * This is enforced: `tests/unit/toast-guard.test.ts` fails the suite if any
 * other file imports Ding or another toast library. See docs/DESIGN.md.
 *
 * Styling lives in globals.css (".tst-viewport"), mapped onto the tokens.
 */
import { Toaster, toast as ding } from "@yusufceng1z/ding-react";
import { useEffect, useState } from "react";

let configured = false;

function configure() {
  if (configured) return;
  configured = true;
  ding.configure({
    // Toasts stay silent.
    sound: false,
    labels: { region: "Notifications", dismiss: "Dismiss notification" },
    // Calm springs, matched to the app's motion (DESIGN.md: UI motion under ~300ms, no bounce on chrome).
    springs: {
      enter: { stiffness: 380, damping: 32, mass: 1 },
      morph: { stiffness: 420, damping: 36, mass: 1 },
      stack: { stiffness: 400, damping: 38, mass: 1 },
    },
  });
}

/** Follow the app's own theme (the `.dark` class), not just the system. */
function useAppTheme(): "light" | "dark" {
  const read = () => (document.documentElement.classList.contains("dark") ? "dark" : "light");
  // The server has no document: start light and settle on mount.
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    setTheme(read());
    const mo = new MutationObserver(() => setTheme(read()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);
  return theme;
}

/** Mount once, in the app shell. */
export function PodiumToaster() {
  configure();
  const theme = useAppTheme();
  return <Toaster position="bottom-right" theme={theme} />;
}

export const toast = ding;
export type { ToastAction, ToastOptions } from "@yusufceng1z/ding";
