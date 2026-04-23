import fs from "node:fs";
import path from "node:path";

const FILE = path.join(process.cwd(), ".pipes-growth.json");

export const growthEvents = [
  "homepage_cta_clicked",
  "pricing_cta_clicked",
  "signup_started",
  "signup_completed",
  "template_detail_viewed",
  "use_case_viewed",
  "comparison_page_viewed",
  "protocol_docs_viewed",
  "public_template_instantiate_clicked",
  "share_page_viewed",
  "logged_out_signup_entry_source",
  "first_value_route_chosen"
] as const;

export type GrowthEvent = (typeof growthEvents)[number];

export function isGrowthEvent(value: string): value is GrowthEvent {
  return (growthEvents as readonly string[]).includes(value);
}

export function recordGrowthEvent(event: GrowthEvent, metadata?: Record<string, unknown>) {
  const now = new Date().toISOString();
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify({ events: [] }, null, 2));
  const parsed = JSON.parse(fs.readFileSync(FILE, "utf8")) as { events: Array<{ event: string; metadata?: Record<string, unknown>; at: string }> };
  parsed.events.push({ event, metadata, at: now });
  fs.writeFileSync(FILE, JSON.stringify(parsed, null, 2));
}
