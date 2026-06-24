"use client";

import { Mail, KeyRound } from "lucide-react";

/**
 * SecurityIncidentDisclosure
 *
 * Bug bounty + coordinated disclosure block. Shows contact, PGP fingerprint
 * in monospace, scope, and out-of-scope lists.
 */

export interface BugBountyContent {
  title: string;
  body: string;
  contact: string;
  pgpFingerprint: string;
  scope: ReadonlyArray<string>;
  outOfScope: ReadonlyArray<string>;
}

export interface SecurityIncidentDisclosureProps {
  bounty: BugBountyContent;
}

export function SecurityIncidentDisclosure({
  bounty,
}: SecurityIncidentDisclosureProps) {
  return (
    <div className="rounded-3xl border border-black/[0.06] bg-white p-8 sm:p-10">
      <h3 className="t-h2 text-[#111]">{bounty.title}</h3>
      <p className="mt-4 t-body text-[#3C3C43] leading-relaxed">
        {bounty.body}
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <a
          href={`mailto:${bounty.contact}`}
          className="group flex items-center gap-4 rounded-2xl border border-black/[0.06] bg-[#FAFAFA] p-5 transition-colors hover:border-black/[0.16]"
        >
          <span
            aria-hidden="true"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#111]"
          >
            <Mail size={18} />
          </span>
          <div className="flex flex-col">
            <span className="t-overline text-[#8E8E93]">Contact</span>
            <span className="t-label font-mono font-semibold text-[#111] group-hover:text-violet-700">
              {bounty.contact}
            </span>
          </div>
        </a>
        <div className="flex items-start gap-4 rounded-2xl border border-black/[0.06] bg-[#FAFAFA] p-5">
          <span
            aria-hidden="true"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#111]"
          >
            <KeyRound size={18} />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="t-overline text-[#8E8E93]">PGP fingerprint</span>
            <span className="t-caption font-mono text-[#111] break-all">
              {bounty.pgpFingerprint}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h4 className="t-overline text-[#3C3C43]">In scope</h4>
          <ul className="flex flex-col gap-2">
            {bounty.scope.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 t-label text-[#111]"
              >
                <span
                  aria-hidden="true"
                  className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
                />
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-3">
          <h4 className="t-overline text-[#3C3C43]">Out of scope</h4>
          <ul className="flex flex-col gap-2">
            {bounty.outOfScope.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 t-label text-[#111]"
              >
                <span
                  aria-hidden="true"
                  className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#C7C7CC]"
                />
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
