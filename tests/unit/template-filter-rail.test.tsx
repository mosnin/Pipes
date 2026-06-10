import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  TemplateFilterRail,
  type TemplateFilterValue,
} from "@/components/marketing/TemplateFilterRail";

const CATEGORIES = ["Engineering", "Operations", "Research"] as const;
const USE_CASES = ["Plan handoff", "Event automation"] as const;

const ALL_VALUE: TemplateFilterValue = {
  category: "all",
  complexity: "all",
  useCase: "all",
};

describe("TemplateFilterRail", () => {
  it("renders the three collapsible sections", () => {
    const onChange = vi.fn();
    render(
      <TemplateFilterRail
        categories={CATEGORIES}
        useCases={USE_CASES}
        value={ALL_VALUE}
        onChange={onChange}
      />,
    );
    expect(screen.getByTestId("filter-section-category")).toBeTruthy();
    expect(screen.getByTestId("filter-section-complexity")).toBeTruthy();
    expect(screen.getByTestId("filter-section-useCase")).toBeTruthy();
  });

  it("renders every category and use case as chips", () => {
    const onChange = vi.fn();
    render(
      <TemplateFilterRail
        categories={CATEGORIES}
        useCases={USE_CASES}
        value={ALL_VALUE}
        onChange={onChange}
      />,
    );
    for (const c of CATEGORIES) {
      expect(screen.getByText(c)).toBeTruthy();
    }
    for (const u of USE_CASES) {
      expect(screen.getByText(u)).toBeTruthy();
    }
  });

  it("renders the four complexity radio options", () => {
    const onChange = vi.fn();
    render(
      <TemplateFilterRail
        categories={CATEGORIES}
        useCases={USE_CASES}
        value={ALL_VALUE}
        onChange={onChange}
      />,
    );
    const radios = screen.getAllByRole("radio");
    expect(radios.length).toBe(4);
    expect(screen.getAllByText("Simple").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Standard").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Advanced").length).toBeGreaterThan(0);
  });

  it("calls onChange with the new category when a chip is clicked", () => {
    const onChange = vi.fn();
    render(
      <TemplateFilterRail
        categories={CATEGORIES}
        useCases={USE_CASES}
        value={ALL_VALUE}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText("Engineering"));
    expect(onChange).toHaveBeenCalledWith({
      ...ALL_VALUE,
      category: "Engineering",
    });
  });

  it("calls onChange with the new complexity when a radio is clicked", () => {
    const onChange = vi.fn();
    render(
      <TemplateFilterRail
        categories={CATEGORIES}
        useCases={USE_CASES}
        value={ALL_VALUE}
        onChange={onChange}
      />,
    );
    // Click the "Simple" radio
    const simpleRadio = screen
      .getAllByRole("radio")
      .find((r) => r.textContent?.includes("Simple"));
    expect(simpleRadio).toBeTruthy();
    fireEvent.click(simpleRadio!);
    expect(onChange).toHaveBeenCalledWith({
      ...ALL_VALUE,
      complexity: "simple",
    });
  });

  it("calls onChange with the new use case when a chip is clicked", () => {
    const onChange = vi.fn();
    render(
      <TemplateFilterRail
        categories={CATEGORIES}
        useCases={USE_CASES}
        value={ALL_VALUE}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText("Plan handoff"));
    expect(onChange).toHaveBeenCalledWith({
      ...ALL_VALUE,
      useCase: "Plan handoff",
    });
  });

  it("shows the reset button only when at least one filter is active", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <TemplateFilterRail
        categories={CATEGORIES}
        useCases={USE_CASES}
        value={ALL_VALUE}
        onChange={onChange}
      />,
    );
    expect(screen.queryByText("Reset")).toBeNull();

    rerender(
      <TemplateFilterRail
        categories={CATEGORIES}
        useCases={USE_CASES}
        value={{ ...ALL_VALUE, category: "Engineering" }}
        onChange={onChange}
      />,
    );
    expect(screen.getByText("Reset")).toBeTruthy();
  });

  it("clicking reset clears all filters to all", () => {
    const onChange = vi.fn();
    render(
      <TemplateFilterRail
        categories={CATEGORIES}
        useCases={USE_CASES}
        value={{
          category: "Engineering",
          complexity: "simple",
          useCase: "Plan handoff",
        }}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText("Reset"));
    expect(onChange).toHaveBeenCalledWith(ALL_VALUE);
  });

  it("marks the active chip with aria-pressed", () => {
    const onChange = vi.fn();
    render(
      <TemplateFilterRail
        categories={CATEGORIES}
        useCases={USE_CASES}
        value={{ ...ALL_VALUE, category: "Engineering" }}
        onChange={onChange}
      />,
    );
    const button = screen.getByText("Engineering").closest("button");
    expect(button).not.toBeNull();
    expect(button!.getAttribute("aria-pressed")).toBe("true");
  });
});
