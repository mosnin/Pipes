import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import {
  EmptyCanvas,
  EmptyTemplates,
  EmptyMembers,
  NotFound404,
  EmptyIssues,
} from "@/components/illustrations";

type IllustrationCase = {
  name: string;
  Component: (props: { size?: number; className?: string }) => ReactElement;
  titleId: string;
  titleMatch: RegExp;
};

const CASES: IllustrationCase[] = [
  {
    name: "EmptyCanvas",
    Component: EmptyCanvas,
    titleId: "illustration-empty-canvas-title",
    titleMatch: /three connected nodes/i,
  },
  {
    name: "EmptyTemplates",
    Component: EmptyTemplates,
    titleId: "illustration-empty-templates-title",
    titleMatch: /template cards/i,
  },
  {
    name: "EmptyMembers",
    Component: EmptyMembers,
    titleId: "illustration-empty-members-title",
    titleMatch: /overlapping avatars/i,
  },
  {
    name: "NotFound404",
    Component: NotFound404,
    titleId: "illustration-not-found-title",
    titleMatch: /broken pipe/i,
  },
  {
    name: "EmptyIssues",
    Component: EmptyIssues,
    titleId: "illustration-empty-issues-title",
    titleMatch: /checkmark/i,
  },
];

describe("illustrations", () => {
  for (const { name, Component, titleId, titleMatch } of CASES) {
    describe(name, () => {
      it("renders an svg element", () => {
        const { container } = render(<Component />);
        const svg = container.querySelector("svg");
        expect(svg).not.toBeNull();
      });

      it("exposes role=img and aria-labelledby pointing at a title element", () => {
        const { container } = render(<Component />);
        const svg = container.querySelector("svg");
        expect(svg).not.toBeNull();
        expect(svg!.getAttribute("role")).toBe("img");
        expect(svg!.getAttribute("aria-labelledby")).toBe(titleId);
        const title = svg!.querySelector("title");
        expect(title).not.toBeNull();
        expect(title!.getAttribute("id")).toBe(titleId);
        expect(title!.textContent ?? "").toMatch(titleMatch);
      });

      it("respects size and className props", () => {
        const { container } = render(<Component size={48} className="text-rose-500" />);
        const svg = container.querySelector("svg");
        expect(svg).not.toBeNull();
        expect(svg!.getAttribute("width")).toBe("48");
        expect(svg!.getAttribute("height")).toBe("48");
        expect(svg!.getAttribute("class") ?? "").toContain("text-rose-500");
      });

      it("uses stroke=currentColor for the primary structure", () => {
        const { container } = render(<Component />);
        const svg = container.querySelector("svg");
        expect(svg!.getAttribute("stroke")).toBe("currentColor");
      });
    });
  }
});
