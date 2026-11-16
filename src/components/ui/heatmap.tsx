/*
 * CALENDAR HEATMAP.
 *
 * Vendored from the 8starlabs registry
 * (https://ui.8starlabs.com/r/heatmap.json) and adapted to this app: it uses
 * our own portalled tooltip rather than a second tooltip library, its five
 * colour rungs are theme tokens rather than fixed greens, and it names what a
 * cell counts so a grid of commits announces commits.
 */
import { cn } from "@/lib/utils";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";
import { HTMLAttributes, ReactNode } from "react";

export type HeatmapValue = {
  date: string; // YYYY-MM-DD
  value: number;
};

export type HeatmapData = HeatmapValue[];

type InterpolationModes = "linear" | "sqrt" | "log";

type ColorOptions =
  | {
      colorMode: "discrete";
      colorScale?: string[];
      customColorMap?: (
        value: number,
        max: number,
        colorCount: number,
      ) => number;
    }
  | {
      colorMode: "interpolate";
      /*
       * Both ends are required and both are raw hex, because interpolation
       * reads the channels and a CSS variable has none to read until the
       * browser resolves it. Discrete mode is the themed one and the right
       * default anywhere in this app; interpolate is for a caller that knows
       * the two colours it wants and accepts that they are fixed.
       */
      maxColor: string;
      minColor: string;
      interpolation?: InterpolationModes;
    };

type HeatmapProps = HTMLAttributes<HTMLDivElement> &
  ColorOptions & {
    data: HeatmapData;
    startDate: Date;
    endDate: Date;
    cellSize?: number;
    gap?: number;
    daysOfTheWeek?: "all" | "MWF" | "none" | "single letter";
    displayStyle?: "squares" | "bubbles";
    dateDisplayFunction?: (date: Date) => ReactNode;
    valueDisplayFunction?: (value: number) => ReactNode;
    /**
     * What one cell counts, singular and plural. It is read out by the cell's
     * own aria-label and by the default tooltip line, so a heatmap of commits
     * never announces itself as a heatmap of events.
     */
    unitLabel?: { one: string; many: string };
    /** Names the grid for a screen reader. */
    label?: string;
  };

function getAllDays(start: string, end: string): string[] {
  // Generate all days between start and end dates (inclusive)
  const days: string[] = [];
  const curr = new Date(start + "T00:00:00");

  const endDate = new Date(end + "T00:00:00");

  while (curr <= endDate) {
    days.push(formatLocalDate(curr));
    curr.setDate(curr.getDate() + 1);
  }

  return days;
}

function padToWeekStart(days: string[]): (string | null)[] {
  // Pad the start of the days array with nulls to align to week start (Sunday)
  // eg. if first day is Wednesday (3), add 3 nulls at start
  const firstDay = new Date(days[0] + "T00:00:00").getDay();
  const padding = new Array(firstDay).fill(null);
  return [...padding, ...days];
}

function chunkByWeek(days: (string | null)[]): (string | null)[][] {
  // Chunk the days into weeks (arrays of 7 days)
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

function getMonthLabel(week: (string | null)[]) {
  // Get month label for the week (based on last non-null day)
  const lastDay = [...week].reverse().find(Boolean);
  return !lastDay
    ? null
    : new Date(lastDay + "T00:00:00").toLocaleString("default", {
        month: "short",
      });
}

function defaultColourMap(value: number, max: number, colorCount: number) {
  // Map value to color index
  // default: we do a linear scale from 0 to max
  if (colorCount <= 0) return 0; // safeguard
  if (max <= 0 || value <= 0) return 0; // all zero values
  const index = Math.ceil((value / max) * (colorCount - 1));
  return Math.min(Math.max(index, 0), colorCount - 1);
}

function interpolateRgb(
  value: number,
  max: number,
  minColor: string,
  maxColor: string,
  scale: InterpolationModes,
) {
  if (value <= 0 || max <= 0) return minColor;

  let t = value / max;

  switch (scale) {
    case "sqrt":
      t = Math.sqrt(t);
      break;
    case "log":
      t = Math.log10(value + 1) / Math.log10(max + 1);
      break;
  }

  // Clamp t between 0 and 1
  t = Math.min(Math.max(t, 0), 1);

  const s = {
    r: parseInt(minColor.slice(1, 3), 16),
    g: parseInt(minColor.slice(3, 5), 16),
    b: parseInt(minColor.slice(5, 7), 16),
  };

  const e = {
    r: parseInt(maxColor.slice(1, 3), 16),
    g: parseInt(maxColor.slice(3, 5), 16),
    b: parseInt(maxColor.slice(5, 7), 16),
  };

  const r = Math.round(s.r + (e.r - s.r) * t);
  const g = Math.round(s.g + (e.g - s.g) * t);
  const b = Math.round(s.b + (e.b - s.b) * t);

  return `rgb(${r}, ${g}, ${b})`;
}

/*
 * Five rungs, defined once in app/globals.css and swapped by theme, so a
 * quiet day reads as the surface it sits on and a busy one reads as the
 * positive mark the rest of the app uses for work that landed.
 */
const defaultIntensityColours = [
  "var(--heat-0)",
  "var(--heat-1)",
  "var(--heat-2)",
  "var(--heat-3)",
  "var(--heat-4)",
];

const daysOfTheWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface DaysOfTheWeekIndicatorProps {
  daysOfTheWeekOption: "all" | "MWF" | "none" | "single letter";
  fontSize: number;
}

function daysOfTheWeekIndicator({
  daysOfTheWeekOption,
  fontSize,
}: DaysOfTheWeekIndicatorProps) {
  if (daysOfTheWeekOption === "none") return null;

  return daysOfTheWeek.map((day, i) =>
    daysOfTheWeekOption === "MWF" && ![1, 3, 5].includes(i) ? (
      <div
        key={i}
        style={{
          gridRow: i + 2,
          gridColumn: 1,
        }}
      />
    ) : (
      <div
        key={i}
        className="flex items-center text-ink-3"
        style={{
          gridRow: i + 2,
          gridColumn: 1,
          justifyContent: "flex-end",
          fontSize,
        }}
      >
        {daysOfTheWeekOption === "single letter" ? day.charAt(0) : day}
      </div>
    ),
  );
}

interface ValueIndicatorProps extends HTMLAttributes<HTMLDivElement> {
  cellSize: number;
  displayStyle: "squares" | "bubbles";
  value: number; // current cell value
  maxValue: number; // maximum possible value out of all cells
  color: string;
}

function ValueIndicator({
  cellSize,
  displayStyle,
  value,
  maxValue,
  color,
  style,
  ...htmlProps
}: ValueIndicatorProps) {
  let finalSize = cellSize;

  if (displayStyle === "bubbles") {
    // Min bubble size = 0.3 * size, Max bubble size = size
    const minScale = 0.3;
    const scale = maxValue > 0 ? value / maxValue : 0;
    finalSize = cellSize * (minScale + (1 - minScale) * scale);

    return (
      <div
        className="flex items-center justify-center"
        style={style}
        {...htmlProps}
      >
        <span
          className="transition-colors rounded-full"
          style={{
            width: finalSize,
            height: finalSize,
            backgroundColor: color,
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="transition-colors rounded-lg"
      style={{
        borderRadius: 4,
        backgroundColor: color,
        ...style,
      }}
      {...htmlProps}
    />
  );
}

/** Every prop this component consumes itself and must not spread onto the DOM. */
const OWN_PROP_KEYS = new Set([
  "data",
  "startDate",
  "endDate",
  "cellSize",
  "gap",
  "daysOfTheWeek",
  "displayStyle",
  "dateDisplayFunction",
  "valueDisplayFunction",
  "unitLabel",
  "label",
  "className",
  "colorMode",
  "colorScale",
  "customColorMap",
  "minColor",
  "maxColor",
  "interpolation",
]);

export default function Heatmap(props: HeatmapProps) {
  const {
    data,
    startDate,
    endDate,
    cellSize = 16,
    daysOfTheWeek = "MWF",
    gap = 4,
    displayStyle = "squares",
    valueDisplayFunction,
    dateDisplayFunction,
    className,
    colorMode,
    unitLabel = { one: "event", many: "events" },
    label = "Activity heatmap",
  } = props;

  const unitFor = (value: number): string =>
    value === 1 ? unitLabel.one : unitLabel.many;

  const valueByDate = new Map<string, number>(
    data.map(({ date, value }) => [date, value]),
  );

  const days = getAllDays(formatLocalDate(startDate), formatLocalDate(endDate));
  const paddedDays = padToWeekStart(days);
  const weeks = chunkByWeek(paddedDays);

  const maxValue = Math.max(...data.map((d) => d.value), 0);

  const monthLabels = weeks.map((week, i) => {
    const label = getMonthLabel(week);
    const previousWeek = i > 0 ? weeks[i - 1] : undefined;
    const prevLabel = previousWeek ? getMonthLabel(previousWeek) : null;
    return label !== prevLabel ? label : null;
  });

  const fontSize = Math.min(12, cellSize);

  /*
   * Everything the caller passed that is not one of this component's own
   * props is forwarded to the grid element. The original did this with two
   * destructures whose bindings were never read, which is the same idea
   * written as dead variables.
   */
  const safeProps = Object.fromEntries(
    Object.entries(props).filter(([key]) => !OWN_PROP_KEYS.has(key)),
  ) as HTMLAttributes<HTMLDivElement>;

  const getCellColor = (value: number) => {
    if (colorMode === "interpolate") {
      if (value <= 0) {
        return "var(--heat-0)";
      }

      // 0 < value <= maxValue
      // interpolate between minColor and maxColor
      return interpolateRgb(
        value,
        maxValue,
        props.minColor,
        props.maxColor,
        props.interpolation ?? "linear",
      );
    } else {
      const colorArray =
        props.colorScale && props.colorScale.length > 0
          ? props.colorScale
          : defaultIntensityColours;

      const map = props.customColorMap ?? defaultColourMap;

      // The map is a caller's function under `customColorMap`, so an index
      // outside the scale is possible: fall back to the quietest rung rather
      // than painting a cell `undefined`.
      return (
        colorArray[map(value, maxValue, colorArray.length)] ?? colorArray[0]!
      );
    }
  };

  return (
    <div
      role="grid"
      className={cn("grid", className)}
      aria-label={label}
      style={{
        gap,
        gridTemplateColumns: `max-content repeat(${weeks.length}, ${cellSize}px)`,
        gridTemplateRows: `repeat(8, ${cellSize}px)`,
      }}
      {...safeProps}
    >
      {daysOfTheWeekIndicator({ daysOfTheWeekOption: daysOfTheWeek, fontSize })}

      {weeks.map((_, i) => (
        <div
          key={`header-${i}`}
          style={{ gridColumn: i + 2, gridRow: 1, fontSize }}
          className="text-ink-3 flex items-end"
        >
          {monthLabels[i]}
        </div>
      ))}

      <TooltipProvider>
        {weeks.map((week, weekIdx) =>
          week.map((day, dayIdx) => {
            if (!day) {
              return (
                <div
                  key={dayIdx}
                  style={{ gridColumn: weekIdx + 2, gridRow: dayIdx + 2 }}
                />
              );
            }

            const thisDateValue = valueByDate.get(day) ?? 0;
            const safeValue = Math.max(0, thisDateValue);
            const thisColor = getCellColor(safeValue);
            const dateForDisplay = new Date(day + "T00:00:00");

            return (
              <Tooltip
                key={dayIdx}
                content={
                  <span className="block">
                    <span className="block">
                      {dateDisplayFunction
                        ? dateDisplayFunction(dateForDisplay)
                        : dateForDisplay.toDateString()}
                    </span>
                    <span className="block opacity-80">
                      {valueDisplayFunction
                        ? valueDisplayFunction(safeValue)
                        : `${safeValue} ${unitFor(safeValue)}`}
                    </span>
                  </span>
                }
              >
                <ValueIndicator
                  style={{ gridColumn: weekIdx + 2, gridRow: dayIdx + 2 }}
                  tabIndex={0}
                  aria-label={`${day}: ${safeValue} ${unitFor(safeValue)}`}
                  id={`heatmap-cell-${day}`}
                  cellSize={cellSize}
                  displayStyle={displayStyle}
                  value={safeValue}
                  maxValue={maxValue}
                  color={thisColor}
                />
              </Tooltip>
            );
          }),
        )}
      </TooltipProvider>
    </div>
  );
}

function formatLocalDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
