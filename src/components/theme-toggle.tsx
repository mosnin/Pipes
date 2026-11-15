"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore, type ReactNode } from "react";
import { Switch } from "@/components/motion/switch";
import { Segmented } from "@/components/ui/segmented";

const emptySubscribe = (): (() => void) => () => {};

type Choice = "light" | "dark" | "system";

const OPTIONS: { value: Choice; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

/**
 * Three-way, not a toggle. A two-state switch silently destroys the `system`
 * default and then cannot restore it — the user loses a setting by using the
 * control once.
 *
 * The flip itself sets `data-theme-switching` on <html> for one frame so no
 * element crossfades through a wrong-mode intermediate colour.
 */
export function ThemeChoice(): ReactNode {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const value: Choice = mounted ? ((theme as Choice) ?? "system") : "system";

  return (
    <div className="flex flex-col gap-3">
      <Switch
        checked={value === "system"}
        onCheckedChange={(follow) =>
          setTheme(
            follow
              ? "system"
              : document.documentElement.classList.contains("dark")
                ? "dark"
                : "light",
          )
        }
        label="Follow system appearance"
      />
      {value !== "system" ? (
        <Segmented
          size="sm"
          value={value}
          options={OPTIONS.filter((option) => option.value !== "system")}
          onValueChange={(next) => {
            const root = document.documentElement;
            root.setAttribute("data-theme-switching", "");
            setTheme(next);
            requestAnimationFrame(() => {
              requestAnimationFrame(() =>
                root.removeAttribute("data-theme-switching"),
              );
            });
          }}
        />
      ) : null}
    </div>
  );
}
