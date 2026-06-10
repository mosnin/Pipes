import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SectionBadge } from "@/components/marketing/SectionBadge";
import { SecurityComplianceBadges } from "@/components/marketing/SecurityComplianceBadges";
import { SecurityControlGrid } from "@/components/marketing/SecurityControlGrid";
import { SecurityIncidentDisclosure } from "@/components/marketing/SecurityIncidentDisclosure";
import {
  complianceItems,
  securityControls,
  architectureProse,
  bugBounty,
  documentationLinks,
} from "@/lib/marketing/security-data";

export const metadata = {
  title: "Security - Pipes",
  description:
    "How Pipes keeps workspace data inside the workspace. Authentication, encryption, audit, isolation, and compliance posture.",
};

export default function SecurityPage() {
  return (
    <div className="bg-white">
      {/* HERO */}
      <section className="px-6 pt-10">
        <div className="mx-auto max-w-6xl">
          <div className="surface-subtle rounded-[40px] border border-black/[0.06] px-6 py-24 text-center sm:py-32">
            <SectionBadge label="Security" />
            <h1
              className="mx-auto mt-6 max-w-3xl text-[#111]"
              style={{
                fontSize: 60,
                lineHeight: 1.04,
                letterSpacing: "-0.04em",
                fontWeight: 700,
              }}
            >
              Security is part of the product.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl t-body leading-relaxed text-[#3C3C43]">
              Workspace is the tenant boundary. Every read filters by it.
              Every write checks for it. Every audit event names it.
            </p>
          </div>
        </div>
      </section>

      {/* COMPLIANCE BADGES */}
      <section className="px-6 pt-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 flex items-end justify-between gap-4">
            <div>
              <h2 className="t-h1 text-[#111]">Compliance posture</h2>
              <p className="mt-2 max-w-xl t-body text-[#3C3C43]">
                Where we are. What is in progress. What is planned.
              </p>
            </div>
            <Link
              href="/security#documentation"
              className="hidden sm:inline-flex t-label font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Request a report {"→"}
            </Link>
          </div>
          <SecurityComplianceBadges items={complianceItems} />
        </div>
      </section>

      {/* CONTROLS */}
      <section className="px-6 pt-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 max-w-2xl">
            <SectionBadge label="Controls" />
            <h2 className="mt-4 t-h1 text-[#111]">
              Controls in production today.
            </h2>
            <p className="mt-3 t-body text-[#3C3C43] leading-relaxed">
              Every line below points at a deployed control, not a plan. The
              evidence column names the file or the table.
            </p>
          </div>
          <SecurityControlGrid controls={securityControls} />
        </div>
      </section>

      {/* ARCHITECTURE */}
      <section className="px-6 pt-24">
        <div className="mx-auto max-w-6xl">
          <div
            className="rounded-[40px] px-8 py-20 text-white sm:px-16 sm:py-24"
            style={{ backgroundColor: "#0A0A0A" }}
          >
            <SectionBadge label="Architecture" tone="neutral" />
            <h2
              className="mt-6 max-w-3xl"
              style={{
                fontSize: 48,
                lineHeight: 1.08,
                letterSpacing: "-0.03em",
                fontWeight: 700,
              }}
            >
              {architectureProse.heading}
            </h2>
            <p className="mt-6 max-w-3xl t-body leading-relaxed text-white/80">
              {architectureProse.body}
            </p>
            <p className="mt-6 t-caption text-white/60">
              {architectureProse.reference}
            </p>
          </div>
        </div>
      </section>

      {/* DISCLOSURE */}
      <section id="disclosure" className="px-6 pt-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 max-w-2xl">
            <SectionBadge label="Coordinated disclosure" />
            <h2 className="mt-4 t-h1 text-[#111]">
              Find a vulnerability? Tell us first.
            </h2>
          </div>
          <SecurityIncidentDisclosure bounty={bugBounty} />
        </div>
      </section>

      {/* DOCUMENTATION */}
      <section id="documentation" className="px-6 pt-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 max-w-2xl">
            <SectionBadge label="Documentation" />
            <h2 className="mt-4 t-h1 text-[#111]">Request the paperwork.</h2>
            <p className="mt-3 t-body text-[#3C3C43] leading-relaxed">
              Reports and agreements available on request. Most arrive
              countersigned within two business days.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {documentationLinks.map((link) => (
              <a
                key={link.id}
                href={link.href}
                className="group flex items-start justify-between gap-6 rounded-3xl border border-black/[0.06] bg-white p-7 transition-shadow hover:shadow-md-token"
              >
                <div className="flex-1">
                  <h3 className="t-h3 text-[#111] group-hover:text-indigo-700">
                    {link.title}
                  </h3>
                  <p className="mt-2 t-label text-[#3C3C43] leading-relaxed">
                    {link.description}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1.5 t-label font-semibold text-indigo-600">
                    {link.cta}
                    <span aria-hidden="true">{"→"}</span>
                  </span>
                </div>
                <ArrowUpRight
                  size={16}
                  aria-hidden="true"
                  className="mt-1 shrink-0 text-[#8E8E93] transition-colors group-hover:text-indigo-700"
                />
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pt-24 pb-24">
        <div className="mx-auto max-w-6xl">
          <div
            className="flex flex-col items-start justify-between gap-8 rounded-[40px] p-10 text-white sm:flex-row sm:items-center sm:p-16"
            style={{ backgroundColor: "#4F46E5" }}
          >
            <div className="flex-1">
              <h2
                className="max-w-2xl"
                style={{
                  fontSize: 40,
                  lineHeight: 1.1,
                  letterSpacing: "-0.025em",
                  fontWeight: 700,
                }}
              >
                Need a specific compliance review?
              </h2>
              <p className="mt-4 max-w-lg t-body text-white/80">
                Send us the framework. We will tell you where we stand and
                what we will sign.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 shrink-0">
              <a
                href="mailto:trust@pipes.dev?subject=Compliance%20review%20request"
                className="inline-flex h-12 items-center gap-1.5 rounded-full bg-white px-6 t-label font-semibold text-[#4F46E5] transition-colors hover:bg-white/90"
              >
                Talk to trust
              </a>
              <Link
                href="/status"
                className="t-label font-semibold text-white/90 transition-colors hover:text-white"
              >
                See live status {"→"}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
