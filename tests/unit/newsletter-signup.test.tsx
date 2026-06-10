import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NewsletterSignup } from "@/components/marketing/NewsletterSignup";

const toastCalls: Array<{ kind: "success" | "error"; message: string }> = [];

vi.mock("sonner", () => ({
  toast: {
    success: (msg: string) => {
      toastCalls.push({ kind: "success", message: msg });
    },
    error: (msg: string) => {
      toastCalls.push({ kind: "error", message: msg });
    },
  },
}));

describe("NewsletterSignup", () => {
  beforeEach(() => {
    toastCalls.length = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the panel variant with the locked copy", () => {
    render(<NewsletterSignup variant="panel" />);
    expect(screen.getByTestId("newsletter-signup")).toBeTruthy();
    expect(
      screen.getByText(
        "Get an email when we ship something interesting. About one a month.",
      ),
    ).toBeTruthy();
  });

  it("shows an error toast when the email is invalid", async () => {
    render(<NewsletterSignup variant="panel" />);
    const input = screen.getByLabelText("Email address") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "not-an-email" } });
    const form = input.closest("form");
    expect(form).not.toBeNull();
    await act(async () => {
      fireEvent.submit(form as HTMLFormElement);
    });
    expect(
      toastCalls.find((t) => t.kind === "error" && /valid email/.test(t.message)),
    ).toBeTruthy();
  });

  it("POSTs to /api/newsletter and shows a success toast on 200", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true, data: { ok: true } }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<NewsletterSignup variant="panel" />);
    const input = screen.getByLabelText("Email address") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "user@example.com" } });
    const form = input.closest("form");
    await act(async () => {
      fireEvent.submit(form as HTMLFormElement);
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/newsletter");
    expect((init as RequestInit).method).toBe("POST");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toEqual({ email: "user@example.com" });

    await waitFor(() => {
      expect(
        toastCalls.find((t) => t.kind === "success"),
      ).toBeTruthy();
    });
  });

  it("shows an error toast when the server returns non-200", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ ok: false, error: "boom" }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<NewsletterSignup variant="panel" />);
    const input = screen.getByLabelText("Email address") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "user@example.com" } });
    const form = input.closest("form");
    await act(async () => {
      fireEvent.submit(form as HTMLFormElement);
    });
    await waitFor(() => {
      expect(toastCalls.find((t) => t.kind === "error")).toBeTruthy();
    });
  });

  it("renders the inline variant with a Subscribe button", () => {
    render(<NewsletterSignup variant="inline" />);
    expect(screen.getByRole("button", { name: /subscribe/i })).toBeTruthy();
  });
});
