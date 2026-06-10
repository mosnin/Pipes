import Link from "next/link";
import { Bell } from "lucide-react";
import { StatusSummaryPanel } from "@/components/marketing/StatusSummaryPanel";
import { StatusServiceRow } from "@/components/marketing/StatusServiceRow";
import { StatusIncidentLog } from "@/components/marketing/StatusIncidentLog";
import {
  services,
  pastIncidents,
  aggregateStatus,
} from "@/lib/marketing/status-data";

export const metadata = {
  title: "Status - Pipes",
  description:
    "Live status for the agent runner, the editor canvas, the public API, the database, webhook delivery, and authentication. Subscribe to updates.",
};

export default function StatusPage() {
  const aggregate = aggregateStatus(services);

  return (
    <div className="bg-white">
      {/* SUMMARY PANEL */}
      <section className="px-6 pt-10">
        <div className="mx-auto max-w-6xl">
          <StatusSummaryPanel aggregate={aggregate} />
        </div>
      </section>

      {/* SERVICES */}
      <section className="px-6 pt-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex items-end justify-between">
            <h2 className="t-h1 text-[#111]">Services</h2>
            <span className="t-caption text-[#8E8E93]">
              Updated every 30 seconds
            </span>
          </div>
          <div className="flex flex-col gap-4">
            {services.map((service) => (
              <StatusServiceRow key={service.id} service={service} />
            ))}
          </div>
        </div>
      </section>

      {/* INCIDENT LOG */}
      <section className="px-6 pt-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="t-h1 text-[#111]">Past incidents</h2>
              <p className="mt-2 max-w-xl t-body text-[#3C3C43]">
                Every Sev-1 and Sev-2 we resolved this year. Postmortems land
                here within 48 hours.
              </p>
            </div>
            <Link
              href="/security#disclosure"
              className="hidden sm:inline-flex t-label font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Coordinated disclosure {"→"}
            </Link>
          </div>
          <StatusIncidentLog incidents={pastIncidents} services={services} />
        </div>
      </section>

      {/* SUBSCRIBE */}
      <section className="px-6 pt-24 pb-24">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-start justify-between gap-8 rounded-[40px] surface-subtle border border-black/[0.06] p-10 sm:flex-row sm:items-center sm:p-14">
            <div className="flex-1">
              <h3 className="t-h1 text-[#111]">Subscribe to status updates.</h3>
              <p className="mt-3 max-w-xl t-body text-[#3C3C43]">
                One email per incident. One email when it resolves. Nothing
                between.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 shrink-0">
              <a
                href="mailto:status@pipes.dev?subject=Subscribe%20to%20status%20updates"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-[#111] px-6 t-label font-semibold text-white transition-colors hover:bg-indigo-700"
              >
                <Bell size={14} aria-hidden="true" />
                Subscribe by email
              </a>
              <a
                href="/status.rss"
                className="t-label font-semibold text-indigo-700 transition-colors hover:text-indigo-900"
              >
                Or use the RSS feed {"→"}
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
