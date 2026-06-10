import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: pushMock, back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/dashboard",
}));

vi.mock("sonner", () => ({
  toast: {
    loading: vi.fn(() => "tid"),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { MobileDashboard } from "@/components/mobile/MobileDashboard";

type LibraryRow = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
  createdBy: string;
  favorite: boolean;
  tags: string[];
};

function mkRow(id: string, name: string, description: string): LibraryRow {
  return {
    id,
    name,
    description,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    createdBy: "user",
    favorite: false,
    tags: [],
  };
}

const emptyLibrary = {
  rows: [],
  recent: [],
  favorites: [],
  availableTags: [],
};

describe("MobileDashboard", () => {
  beforeEach(() => {
    pushMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the hero copy and starter chips", () => {
    render(<MobileDashboard initialLibrary={emptyLibrary} />);
    expect(screen.getByText(/Describe your system/i)).toBeTruthy();
    expect(screen.getByText(/Watch it build itself/i)).toBeTruthy();
    expect(screen.getByText(/Support triage/i)).toBeTruthy();
    expect(screen.getByText(/Code review/i)).toBeTruthy();
    expect(screen.getByText(/Document QA/i)).toBeTruthy();
  });

  it("shows the empty state when there are no systems", () => {
    render(<MobileDashboard initialLibrary={emptyLibrary} />);
    expect(screen.getByText(/No systems yet/i)).toBeTruthy();
  });

  it("renders each system as a card and routes on tap", () => {
    const library = {
      ...emptyLibrary,
      rows: [mkRow("sys-1", "Planner system", "A small planner"), mkRow("sys-2", "Doc QA", "Answers questions")],
    };
    render(<MobileDashboard initialLibrary={library} />);
    expect(screen.getByText("Planner system")).toBeTruthy();
    expect(screen.getByText("Doc QA")).toBeTruthy();
    fireEvent.click(screen.getByText("Planner system"));
    expect(pushMock).toHaveBeenCalledWith("/systems/sys-1");
  });

  it("opens the full-screen prompt modal when the hero input is tapped", async () => {
    render(<MobileDashboard initialLibrary={emptyLibrary} />);
    const trigger = screen.getByText(/A planner reads tickets/i);
    fireEvent.click(trigger);
    await waitFor(() => {
      expect(screen.getByTestId("mobile-dashboard-prompt-modal")).toBeTruthy();
    });
  });

  it("starts a new system when the user submits the prompt", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, data: { systemId: "sys-new" } }),
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);
    render(<MobileDashboard initialLibrary={emptyLibrary} />);
    fireEvent.click(screen.getByText(/A planner reads tickets/i));
    const textarea = await screen.findByLabelText(/system description/i);
    fireEvent.change(textarea, { target: { value: "A simple planner" } });
    fireEvent.click(screen.getByRole("button", { name: /^start$/i }));
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalled();
    });
    expect(pushMock.mock.calls[0][0]).toContain("/systems/sys-new");
    expect(pushMock.mock.calls[0][0]).toContain("prompt=A");
    vi.unstubAllGlobals();
  });
});
