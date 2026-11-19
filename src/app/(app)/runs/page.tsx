import type { Metadata } from "next";
import { RunsIndexClient } from "@/components/runs/RunsIndexClient";

export const metadata: Metadata = { title: "Runs" };

export default function RunsPage() {
  return <RunsIndexClient />;
}
