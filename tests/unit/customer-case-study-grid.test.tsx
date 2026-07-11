import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CustomerCaseStudyGrid } from "@/components/marketing/CustomerCaseStudyGrid";
import type { CaseStudy } from "@/lib/marketing/customers-data";

const STUDIES: ReadonlyArray<CaseStudy> = [
  {
    slug: "alpha",
    company: "Alpha Co",
    category: "Engineering",
    persona: "Alice",
    role: "Staff engineer",
    outcome: "3 days saved",
    story: "Engineering shipped faster.",
    useCaseSlug: "multi-agent-systems",
  },
  {
    slug: "bravo",
    company: "Bravo Co",
    category: "Support",
    persona: "Bob",
    role: "Head of support",
    outcome: "Fewer escalations",
    story: "Support read the same map.",
    useCaseSlug: null,
  },
  {
    slug: "charlie",
    company: "Charlie Co",
    category: "Data",
    persona: "Cara",
    role: "Data lead",
    outcome: "One diagram",
    story: "All pipelines on one map.",
    useCaseSlug: null,
  },
];

describe("CustomerCaseStudyGrid", () => {
  it("renders every case study when the All filter is selected", () => {
    render(<CustomerCaseStudyGrid studies={STUDIES} />);
    const cards = screen.getAllByTestId("case-study-card");
    expect(cards).toHaveLength(STUDIES.length);
    expect(screen.getByText("Alpha Co")).toBeTruthy();
    expect(screen.getByText("Bravo Co")).toBeTruthy();
    expect(screen.getByText("Charlie Co")).toBeTruthy();
  });

  it("filters cards when a category chip is selected", () => {
    render(<CustomerCaseStudyGrid studies={STUDIES} />);
    fireEvent.click(screen.getByTestId("case-study-filter-engineering"));
    const cards = screen.getAllByTestId("case-study-card");
    expect(cards).toHaveLength(1);
    expect(screen.getByText("Alpha Co")).toBeTruthy();
    expect(screen.queryByText("Bravo Co")).toBeNull();
  });

  it("links to the matching use-case slug when one is present", () => {
    render(<CustomerCaseStudyGrid studies={STUDIES} />);
    const alphaLink = screen
      .getAllByRole("link", { name: /Read story/i })
      .find((a) => a.getAttribute("href") === "/use-cases/multi-agent-systems");
    expect(alphaLink).toBeTruthy();
  });

  it("falls back to a hash anchor when no use-case slug exists", () => {
    render(<CustomerCaseStudyGrid studies={STUDIES} />);
    const charlieLink = screen
      .getAllByRole("link", { name: /Read story/i })
      .find((a) => a.getAttribute("href") === "/customers#charlie");
    expect(charlieLink).toBeTruthy();
  });

  it("shows an empty state copy when filter matches nothing", () => {
    render(<CustomerCaseStudyGrid studies={STUDIES.slice(0, 1)} />);
    fireEvent.click(screen.getByTestId("case-study-filter-sales"));
    expect(screen.queryAllByTestId("case-study-card")).toHaveLength(0);
    expect(screen.getByText(/No case studies in this category/i)).toBeTruthy();
  });
});
