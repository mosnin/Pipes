/**
 * A minimal five-field cron matcher (minute hour day-of-month month day-of-week),
 * evaluated in UTC. Supports `*`, numbers, lists (`1,15`), ranges (`1-5`) and
 * steps (`*\/15`, `0-30/10`). Day-of-week 0 and 7 are Sunday.
 */
const FIELDS = [
  { min: 0, max: 59 },
  { min: 0, max: 23 },
  { min: 1, max: 31 },
  { min: 1, max: 12 },
  { min: 0, max: 7 }
];

function parseField(expr: string, { min, max }: { min: number; max: number }): Set<number> {
  const values = new Set<number>();
  for (const part of expr.split(",")) {
    const [range, stepText] = part.split("/");
    const step = stepText ? Number(stepText) : 1;
    if (!Number.isInteger(step) || step < 1) throw new Error(`Invalid step in "${part}".`);
    let start = min;
    let end = max;
    if (range !== "*") {
      const [a, b] = range.split("-").map(Number);
      if (!Number.isInteger(a) || a < min || a > max) throw new Error(`"${part}" is out of range ${min}-${max}.`);
      start = a;
      end = b === undefined || Number.isNaN(b) ? (stepText ? max : a) : b;
      if (!Number.isInteger(end) || end < start || end > max) throw new Error(`"${part}" is out of range ${min}-${max}.`);
    }
    for (let v = start; v <= end; v += step) values.add(v);
  }
  return values;
}

export type CronSchedule = { minutes: Set<number>; hours: Set<number>; days: Set<number>; months: Set<number>; weekdays: Set<number>; restrictDay: boolean; restrictWeekday: boolean };

export function parseCron(expression: string): CronSchedule {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) throw new Error("A schedule needs five fields: minute hour day month weekday.");
  const [minutes, hours, days, months, weekdays] = parts.map((p, i) => parseField(p, FIELDS[i]));
  if (weekdays.has(7)) weekdays.add(0);
  return { minutes, hours, days, months, weekdays, restrictDay: parts[2] !== "*", restrictWeekday: parts[4] !== "*" };
}

export function matches(schedule: CronSchedule, date: Date): boolean {
  if (!schedule.minutes.has(date.getUTCMinutes()) || !schedule.hours.has(date.getUTCHours()) || !schedule.months.has(date.getUTCMonth() + 1)) return false;
  const dayOk = schedule.days.has(date.getUTCDate());
  const weekdayOk = schedule.weekdays.has(date.getUTCDay());
  // Standard cron: when both day fields are restricted, either may match.
  if (schedule.restrictDay && schedule.restrictWeekday) return dayOk || weekdayOk;
  if (schedule.restrictDay) return dayOk;
  if (schedule.restrictWeekday) return weekdayOk;
  return true;
}

/** The first matching minute strictly after `after` and no later than `until`, or null. Looks at most 8 days ahead. */
export function nextFireBetween(expression: string, after: Date, until: Date): Date | null {
  const schedule = parseCron(expression);
  const cursor = new Date(after);
  cursor.setUTCSeconds(0, 0);
  cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);
  const limit = Math.min(until.getTime(), after.getTime() + 8 * 24 * 60 * 60 * 1000);
  while (cursor.getTime() <= limit) {
    if (matches(schedule, cursor)) return new Date(cursor);
    cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);
  }
  return null;
}

export function describeCronError(expression: string): string | null {
  try {
    parseCron(expression);
    return null;
  } catch (error) {
    return (error as Error).message;
  }
}
