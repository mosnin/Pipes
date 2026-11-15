"use client";
import { useId, type ReactNode, type KeyboardEvent } from "react";
import {
  Tabs as MotionTabs,
  TabsList,
  TabsTrigger,
} from "@/components/motion/tabs";
import { cn } from "@/lib/utils";
export interface TabItem {
  value: string;
  label: ReactNode;
  count?: number;
  disabled?: boolean;
}
export interface TabsProps {
  value: string;
  onValueChange: (v: string) => void;
  items: TabItem[];
  label?: string;
  className?: string;
}
export function Tabs({
  value,
  onValueChange,
  items,
  label,
  className,
}: TabsProps): ReactNode {
  const id = useId();
  function navigate(event: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const enabled = items.filter((item) => !item.disabled);
    if (!enabled.length) return;
    const index = enabled.findIndex((item) => item.value === value);
    const next =
      event.key === "Home"
        ? enabled[0]
        : event.key === "End"
          ? enabled.at(-1)!
          : enabled[
              (index + (event.key === "ArrowRight" ? 1 : -1) + enabled.length) %
                enabled.length
            ];
    if (!next) return;
    onValueChange(next.value);
    document
      .getElementById(`${id}-${next.value}`)
      ?.focus({ preventScroll: true });
    document
      .getElementById(`${id}-${next.value}`)
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
  return (
    <div
      className={cn(
        "min-w-0 overflow-x-auto border-b border-border",
        className,
      )}
    >
      <MotionTabs
        value={value}
        onValueChange={onValueChange}
        variant="underline"
      >
        <TabsList
          aria-label={label}
          onKeyDown={navigate}
          className="gap-6 border-0"
        >
          <>
            {items.map((item) => (
              <TabsTrigger
                key={item.value}
                id={`${id}-${item.value}`}
                value={item.value}
                disabled={item.disabled}
                tabIndex={item.value === value ? 0 : -1}
                className="shrink-0 gap-2 whitespace-nowrap px-1 t-body-strong focus-ring outline-none disabled:opacity-50"
                indicatorClassName="bg-ink"
              >
                {item.label}
                {item.count !== undefined ? (
                  <span className="t-caption text-ink-3 tabular-nums">
                    {item.count}
                  </span>
                ) : null}
              </TabsTrigger>
            ))}
          </>
        </TabsList>
      </MotionTabs>
    </div>
  );
}
