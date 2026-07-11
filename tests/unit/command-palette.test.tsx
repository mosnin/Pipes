import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { CommandPalette, type CommandItem } from "@/components/editor/CommandPalette";

function makeItems(opts: { runA?: () => void; runB?: () => void }): CommandItem[] {
  return [
    {
      id: "new-system",
      label: "New system",
      section: "actions",
      combo: "cmd+n",
      run: opts.runA ?? (() => {}),
    },
    {
      id: "go-systems",
      label: "Systems",
      section: "navigation",
      run: opts.runB ?? (() => {}),
    },
    {
      id: "show-shortcuts",
      label: "Keyboard shortcuts",
      section: "help",
      combo: "?",
      run: () => {},
    },
  ];
}

function Harness({ items, initialOpen = true }: { items: CommandItem[]; initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <CommandPalette open={open} onOpenChange={setOpen} items={items} scopeLabel="editor" />
  );
}

describe("CommandPalette", () => {
  it("renders an open palette with grouped sections", () => {
    render(<Harness items={makeItems({})} />);
    expect(screen.getByRole("dialog", { name: /command palette/i })).toBeTruthy();
    expect(screen.getByText(/Actions/)).toBeTruthy();
    expect(screen.getByText(/Navigation/)).toBeTruthy();
    expect(screen.getByText(/Help/)).toBeTruthy();
    expect(screen.getByText(/New system/)).toBeTruthy();
  });

  it("filters by query substring across label and section", () => {
    render(<Harness items={makeItems({})} />);
    const input = screen.getByTestId("command-palette-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "system" } });
    expect(screen.getByText(/New system/)).toBeTruthy();
    expect(screen.getByText(/^Systems$/)).toBeTruthy();
    expect(screen.queryByText(/Keyboard shortcuts/)).toBeNull();
  });

  it("invokes run() on Enter for the active item", async () => {
    const runA = vi.fn();
    render(<Harness items={makeItems({ runA })} />);
    const input = screen.getByTestId("command-palette-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "New system" } });
    fireEvent.keyDown(window, { key: "Enter" });
    await waitFor(() => expect(runA).toHaveBeenCalledTimes(1));
  });

  it("closes on Escape", async () => {
    render(<Harness items={makeItems({})} />);
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: /command palette/i })).toBeNull(),
    );
  });

  it("ArrowDown moves the active option", () => {
    render(<Harness items={makeItems({})} />);
    fireEvent.keyDown(window, { key: "ArrowDown" });
    const options = screen.getAllByRole("option");
    expect(options.length).toBeGreaterThan(1);
    expect(options[1].getAttribute("aria-selected")).toBe("true");
  });
});
