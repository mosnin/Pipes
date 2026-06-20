import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MobileFullPageMenu } from "@/components/marketing/MobileFullPageMenu";
import { navItems } from "@/lib/marketing/nav-data";

// Force jsdom into a desktop viewport so the desktop layout renders.
function setDesktopViewport(): void {
  Object.defineProperty(window, "innerWidth", { value: 1280, configurable: true, writable: true });
  Object.defineProperty(window, "innerHeight", { value: 900, configurable: true, writable: true });
}

function setMobileViewport(): void {
  Object.defineProperty(window, "innerWidth", { value: 480, configurable: true, writable: true });
  Object.defineProperty(window, "innerHeight", { value: 800, configurable: true, writable: true });
}

beforeEach(() => {
  setDesktopViewport();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("MarketingNav — pill nav", () => {
  it("renders the wordmark and the auth actions", () => {
    render(<MarketingNav />);
    expect(screen.getAllByText("Looper").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /log in/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /start free/i })).toBeTruthy();
  });

  it("renders one trigger per nav item in the desktop bar", () => {
    render(<MarketingNav />);
    const mainNav = screen.getByLabelText("Main navigation");
    for (const item of navItems) {
      // Each label appears at least once in the main nav.
      expect(within(mainNav).getAllByText(item.label).length).toBeGreaterThan(0);
    }
  });

  it("flips data-scrolled past the 32px threshold", () => {
    render(<MarketingNav />);
    const pill = screen.getByTestId("marketing-nav-pill");
    expect(pill.getAttribute("data-scrolled")).toBe("false");

    Object.defineProperty(window, "scrollY", { value: 64, configurable: true, writable: true });
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });

    expect(pill.getAttribute("data-scrolled")).toBe("true");
  });

  it("opens the mega menu when a trigger is clicked and toggles aria-expanded", () => {
    render(<MarketingNav />);
    const mainNav = screen.getByLabelText("Main navigation");
    const productTrigger = within(mainNav).getByRole("button", { name: /product/i });
    expect(productTrigger.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(productTrigger);
    expect(productTrigger.getAttribute("aria-expanded")).toBe("true");

    // The shared mega panel renders with role=menu.
    expect(screen.getByRole("menu", { name: /mega menu/i })).toBeTruthy();
  });

  it("cross-fades content when moving between two mega triggers", () => {
    render(<MarketingNav />);
    const mainNav = screen.getByLabelText("Main navigation");
    const productTrigger = within(mainNav).getByRole("button", { name: /product/i });
    const customersTrigger = within(mainNav).getByRole("button", { name: /customers/i });

    fireEvent.mouseEnter(productTrigger);
    expect(productTrigger.getAttribute("aria-expanded")).toBe("true");
    expect(customersTrigger.getAttribute("aria-expanded")).toBe("false");

    fireEvent.mouseEnter(customersTrigger);
    expect(productTrigger.getAttribute("aria-expanded")).toBe("false");
    expect(customersTrigger.getAttribute("aria-expanded")).toBe("true");
    // Panel still mounted (cross-fade, no close/reopen).
    expect(screen.getByRole("menu", { name: /mega menu/i })).toBeTruthy();
  });

  it("closes the mega menu on Escape", () => {
    render(<MarketingNav />);
    const mainNav = screen.getByLabelText("Main navigation");
    const trigger = within(mainNav).getByRole("button", { name: /docs/i });
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    act(() => {
      fireEvent.keyDown(window, { key: "Escape" });
    });

    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("renders Pricing as a direct link (no menu)", () => {
    render(<MarketingNav />);
    const mainNav = screen.getByLabelText("Main navigation");
    const link = within(mainNav).getByRole("link", { name: /pricing/i });
    expect(link.getAttribute("href")).toBe("/pricing");
  });

  it("renders the hamburger trigger for mobile", () => {
    render(<MarketingNav />);
    expect(screen.getByTestId("marketing-nav-hamburger")).toBeTruthy();
  });
});

describe("MobileFullPageMenu — drawer", () => {
  it("renders nothing when closed", () => {
    render(<MobileFullPageMenu open={false} onClose={() => undefined} />);
    expect(screen.queryByTestId("mobile-drawer")).toBeNull();
  });

  it("renders sections for each nav item when open", () => {
    setMobileViewport();
    render(<MobileFullPageMenu open={true} onClose={() => undefined} />);
    const drawer = screen.getByTestId("mobile-drawer");
    // Sections include all top-level labels.
    for (const item of navItems) {
      expect(within(drawer).getAllByText(item.label).length).toBeGreaterThan(0);
    }
    // Bottom auth actions present.
    expect(within(drawer).getByRole("link", { name: /log in/i })).toBeTruthy();
    expect(within(drawer).getByRole("link", { name: /start free/i })).toBeTruthy();
  });

  it("calls onClose when Escape is pressed", () => {
    setMobileViewport();
    const onClose = vi.fn();
    render(<MobileFullPageMenu open={true} onClose={onClose} />);

    act(() => {
      fireEvent.keyDown(window, { key: "Escape" });
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("locks body scroll while open", () => {
    setMobileViewport();
    const { unmount } = render(<MobileFullPageMenu open={true} onClose={() => undefined} />);
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("traps focus inside the drawer", () => {
    setMobileViewport();
    render(<MobileFullPageMenu open={true} onClose={() => undefined} />);
    const drawer = screen.getByTestId("mobile-drawer");
    const focusables = drawer.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    expect(focusables.length).toBeGreaterThan(2);

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    // Tab from the last element wraps to the first.
    last.focus();
    const tabEvent = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    act(() => {
      window.dispatchEvent(tabEvent);
    });
    expect(document.activeElement).toBe(first);
  });
});

describe("nav-data — banned-words check", () => {
  // Audience.md ban list. Voice rule: ASCII only, no curly quotes either.
  const BANNED = [
    "platform",
    "solution",
    "leverage",
    "empower",
    "seamless",
    "unlock",
    "robust",
    "holistic",
    "cutting-edge",
    "world-class",
    "best-in-class",
  ];

  it("has no banned words in any nav label or copy", () => {
    const all: string[] = [];
    for (const item of navItems) {
      all.push(item.label);
      if (item.menu.kind === "direct") continue;
      switch (item.menu.kind) {
        case "product":
          for (const cat of item.menu.categories) {
            all.push(cat.heading);
            for (const link of cat.links) {
              all.push(link.label);
              if (link.description) all.push(link.description);
            }
          }
          for (const f of item.menu.featured) {
            all.push(f.eyebrow, f.title, f.body);
          }
          break;
        case "use-cases":
          for (const c of item.menu.cards) all.push(c.title, c.body);
          break;
        case "docs":
          for (const l of [...item.menu.quickstart, ...item.menu.whatsNew]) {
            all.push(l.label);
            if (l.description) all.push(l.description);
          }
          break;
        case "customers":
          for (const c of item.menu.cards) all.push(c.persona, c.quote, c.signature);
          break;
      }
    }

    for (const text of all) {
      const lower = text.toLowerCase();
      for (const word of BANNED) {
        expect(lower.includes(word), `"${text}" contains banned word "${word}"`).toBe(false);
      }
      // ASCII only.
      expect(/^[\x00-\x7F]*$/.test(text), `"${text}" contains non-ASCII characters`).toBe(true);
    }
  });
});
