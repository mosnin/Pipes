/**
 * A plain-language reading of the cron patterns people actually write. It is
 * a reading aid, not a parser: anything it does not recognise returns null and
 * the expression is shown as typed. The API is the one that validates.
 */
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const isNum = (v: string) => /^\d+$/.test(v);
const pad = (n: number) => String(n).padStart(2, "0");

function weekdayPhrase(field: string): string | null {
  if (field === "*") return null;
  if (field === "1-5") return "on weekdays";
  if (field === "0,6" || field === "6,0" || field === "6,7") return "on weekends";
  if (isNum(field) && Number(field) <= 7) return `on ${WEEKDAYS[Number(field)]}s`;
  const parts = field.split(",");
  if (parts.every((p) => isNum(p) && Number(p) <= 7)) {
    const names = parts.map((p) => WEEKDAYS[Number(p)]);
    return `on ${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  }
  return null;
}

function ordinal(n: number): string {
  const teen = n % 100;
  if (teen >= 11 && teen <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

export function readCron(expression: string): string | null {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  const [minute, hour, day, month, weekday] = parts;
  if (month !== "*") return null;

  if (minute === "*" && hour === "*" && day === "*" && weekday === "*") return "Every minute";
  const everyMinutes = /^\*\/(\d+)$/.exec(minute);
  if (everyMinutes && hour === "*" && day === "*" && weekday === "*") return `Every ${everyMinutes[1]} minutes`;
  if (isNum(minute) && hour === "*" && day === "*" && weekday === "*") {
    return Number(minute) === 0 ? "Every hour, on the hour" : `Every hour at ${pad(Number(minute))} past`;
  }
  const everyHours = /^\*\/(\d+)$/.exec(hour);
  if (isNum(minute) && everyHours && day === "*" && weekday === "*") return `Every ${everyHours[1]} hours at ${pad(Number(minute))} past`;

  if (!isNum(minute) || !isNum(hour)) return null;
  const time = `${pad(Number(hour))}:${pad(Number(minute))} UTC`;
  if (day === "*") {
    const days = weekdayPhrase(weekday);
    if (weekday !== "*" && !days) return null;
    return days ? `At ${time} ${days}` : `Every day at ${time}`;
  }
  if (isNum(day) && weekday === "*") return `At ${time} on the ${ordinal(Number(day))} of every month`;
  return null;
}
