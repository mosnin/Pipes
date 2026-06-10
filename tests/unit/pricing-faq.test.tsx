import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PricingFaq, type FaqItem } from "@/components/marketing/PricingFaq";

const ITEMS: readonly FaqItem[] = [
  {
    id: "faq-one",
    question: "What is a build?",
    answer: "Every prompt the agent acts on counts as one build.",
  },
  {
    id: "faq-two",
    question: "Can I bring my own model keys?",
    answer: "Yes. Drop in your OpenAI or Anthropic key per workspace.",
  },
  {
    id: "faq-three",
    question: "Is there a trial?",
    answer: "Team includes a 14-day trial with no card.",
  },
] as const;

describe("PricingFaq", () => {
  it("renders every question", () => {
    render(<PricingFaq items={ITEMS} />);
    expect(screen.getByText("What is a build?")).toBeTruthy();
    expect(screen.getByText("Can I bring my own model keys?")).toBeTruthy();
    expect(screen.getByText("Is there a trial?")).toBeTruthy();
  });

  it("starts with every item collapsed", () => {
    render(<PricingFaq items={ITEMS} />);
    const triggers = screen.getAllByRole("button");
    triggers.forEach((trigger) => {
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
    });
  });

  it("expands an item when clicked", () => {
    render(<PricingFaq items={ITEMS} />);
    const trigger = screen.getByRole("button", { name: /What is a build\?/ });
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(
      screen.getByText(
        "Every prompt the agent acts on counts as one build.",
      ),
    ).toBeTruthy();
  });

  it("only allows one item open at a time", () => {
    render(<PricingFaq items={ITEMS} />);
    const first = screen.getByRole("button", { name: /What is a build\?/ });
    const second = screen.getByRole("button", {
      name: /Can I bring my own model keys\?/,
    });
    fireEvent.click(first);
    expect(first.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(second);
    expect(second.getAttribute("aria-expanded")).toBe("true");
    expect(first.getAttribute("aria-expanded")).toBe("false");
  });

  it("collapses the open item when clicked again", () => {
    render(<PricingFaq items={ITEMS} />);
    const trigger = screen.getByRole("button", { name: /Is there a trial\?/ });
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });
});
