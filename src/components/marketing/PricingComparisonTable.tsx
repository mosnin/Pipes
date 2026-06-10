"use client";

// Feature-by-feature comparison table.
//
// The first <thead> is sticky so the tier columns stay anchored while you
// scroll a long list of features. Each row has a subtle hover tint. Section
// headers carve the table into chunks (Features, Limits, Support, Security,
// Compliance). Cell values are either a typed string, a boolean (rendered
// as a small check or em-dash), or a "Limited" tag.

import { Fragment, useId } from "react";

export type ComparisonCellValue =
  | string
  | boolean
  | { kind: "limited"; label?: string };

export type ComparisonRow = {
  feature: string;
  detail?: string;
  starter: ComparisonCellValue;
  team: ComparisonCellValue;
  enterprise: ComparisonCellValue;
};

export type ComparisonGroup = {
  title: string;
  rows: readonly ComparisonRow[];
};

interface PricingComparisonTableProps {
  groups: readonly ComparisonGroup[];
}

function Cell({ value }: { value: ComparisonCellValue }) {
  if (typeof value === "string") {
    return (
      <span className="t-label font-medium text-[#111]">{value}</span>
    );
  }
  if (typeof value === "boolean") {
    if (value) {
      return (
        <span
          aria-label="Included"
          className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-indigo-700 font-semibold"
          style={{ fontSize: 12 }}
        >
          {"✓"}
        </span>
      );
    }
    return (
      <span
        aria-label="Not included"
        className="inline-block text-[#C7C7CC]"
        style={{ fontSize: 18, lineHeight: 1 }}
      >
        {"–"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 t-caption font-semibold text-indigo-700">
      {value.label ?? "Limited"}
    </span>
  );
}

export function PricingComparisonTable({ groups }: PricingComparisonTableProps) {
  const tableId = useId();

  return (
    <div className="rounded-3xl border border-black/[0.06] bg-white overflow-hidden">
      <div className="max-h-[640px] overflow-y-auto scrollbar-thin">
        <table
          aria-labelledby={tableId}
          className="w-full text-left border-collapse"
        >
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b border-black/[0.08]">
              <th
                scope="col"
                className="px-6 py-5 t-overline text-[#8E8E93]"
                style={{ width: "40%" }}
              >
                Feature
              </th>
              <th
                scope="col"
                className="px-4 py-5 text-center t-label font-semibold text-[#111]"
              >
                <div className="flex flex-col items-center gap-0.5">
                  <span>Starter</span>
                  <span className="t-caption font-normal text-[#8E8E93]">
                    Free
                  </span>
                </div>
              </th>
              <th
                scope="col"
                className="px-4 py-5 text-center t-label font-semibold text-indigo-700 bg-indigo-50/40"
              >
                <div className="flex flex-col items-center gap-0.5">
                  <span>Team</span>
                  <span className="t-caption font-normal text-indigo-700/80">
                    $12 / seat
                  </span>
                </div>
              </th>
              <th
                scope="col"
                className="px-4 py-5 text-center t-label font-semibold text-[#111]"
              >
                <div className="flex flex-col items-center gap-0.5">
                  <span>Enterprise</span>
                  <span className="t-caption font-normal text-[#8E8E93]">
                    Custom
                  </span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group, gIdx) => (
              <Fragment key={group.title}>
                <tr>
                  <td
                    colSpan={4}
                    className={[
                      "px-6 pt-7 pb-3 t-overline text-[#3C3C43]",
                      gIdx === 0 ? "" : "border-t border-black/[0.06]",
                    ].join(" ")}
                  >
                    {group.title}
                  </td>
                </tr>
                {group.rows.map((row) => (
                  <tr
                    key={`${group.title}-${row.feature}`}
                    className="border-t border-black/[0.04] transition-colors hover:bg-[#FAFAFA]"
                  >
                    <td className="px-6 py-4 align-top">
                      <span className="t-label font-medium text-[#111]">
                        {row.feature}
                      </span>
                      {row.detail != null && (
                        <p className="mt-0.5 t-caption text-[#8E8E93] leading-snug">
                          {row.detail}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center align-middle">
                      <Cell value={row.starter} />
                    </td>
                    <td className="px-4 py-4 text-center align-middle bg-indigo-50/20">
                      <Cell value={row.team} />
                    </td>
                    <td className="px-4 py-4 text-center align-middle">
                      <Cell value={row.enterprise} />
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
