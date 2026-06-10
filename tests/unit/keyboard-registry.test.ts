import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  _resetRegistry,
  comboToKeys,
  dispatch,
  list,
  parseCombo,
  register,
} from "@/lib/keyboard/registry";

beforeEach(() => {
  _resetRegistry();
});

afterEach(() => {
  _resetRegistry();
});

describe("keyboard registry", () => {
  it("parseCombo handles cmd+k", () => {
    const p = parseCombo("cmd+k");
    expect(p.meta).toBe(true);
    expect(p.key).toBe("k");
    expect(p.ctrl).toBe(false);
  });

  it("parseCombo handles single ?", () => {
    const p = parseCombo("?");
    expect(p.key).toBe("?");
    expect(p.meta).toBe(false);
    expect(p.ctrl).toBe(false);
    expect(p.shift).toBe(false);
  });

  it("parseCombo handles named keys like esc and enter", () => {
    expect(parseCombo("esc").key).toBe("escape");
    expect(parseCombo("enter").key).toBe("enter");
  });

  it("register adds to list and unregister removes", () => {
    const handler = vi.fn();
    const off = register({
      id: "test.a",
      combo: "cmd+a",
      label: "Test A",
      group: "test",
      handler,
    });
    expect(list().length).toBe(1);
    off();
    expect(list().length).toBe(0);
  });

  it("register is idempotent on id (last write wins)", () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    register({ id: "x", combo: "cmd+x", label: "X1", group: "t", handler: h1 });
    register({ id: "x", combo: "cmd+x", label: "X2", group: "t", handler: h2 });
    expect(list().length).toBe(1);
    expect(list()[0].label).toBe("X2");
  });

  it("dispatch invokes the matching handler", () => {
    const h = vi.fn();
    register({
      id: "p",
      combo: "cmd+k",
      label: "Open palette",
      group: "global",
      handler: h,
    });
    expect(dispatch("cmd+k")).toBe(true);
    expect(h).toHaveBeenCalledTimes(1);
  });

  it("dispatch returns false for unknown combo", () => {
    expect(dispatch("cmd+unknown")).toBe(false);
  });

  it("dispatch respects scope filter", () => {
    const h = vi.fn();
    register({
      id: "scoped",
      combo: "cmd+e",
      label: "Editor only",
      group: "editor",
      scope: "editor",
      handler: h,
    });
    expect(dispatch("cmd+e", "drawer")).toBe(false);
    expect(h).not.toHaveBeenCalled();
    expect(dispatch("cmd+e", "editor")).toBe(true);
  });

  it("window keydown fires the registered handler", () => {
    const h = vi.fn();
    register({
      id: "w",
      combo: "cmd+k",
      label: "K",
      group: "global",
      handler: h,
    });
    const event = new KeyboardEvent("keydown", { key: "k", metaKey: true });
    window.dispatchEvent(event);
    expect(h).toHaveBeenCalledTimes(1);
  });

  it("window keydown skips while typing in an input (no modifier)", () => {
    const h = vi.fn();
    register({
      id: "q",
      combo: "?",
      label: "Help",
      group: "global",
      handler: h,
    });
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    const event = new KeyboardEvent("keydown", { key: "?", bubbles: true });
    input.dispatchEvent(event);
    expect(h).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it("window keydown still fires cmd+k inside an input", () => {
    const h = vi.fn();
    register({
      id: "k",
      combo: "cmd+k",
      label: "Palette",
      group: "global",
      handler: h,
    });
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      bubbles: true,
    });
    input.dispatchEvent(event);
    expect(h).toHaveBeenCalledTimes(1);
    document.body.removeChild(input);
  });

  it("comboToKeys produces capsule symbols", () => {
    const out = comboToKeys("cmd+k");
    expect(out.length).toBe(2);
    expect(out[out.length - 1]).toBe("K");
  });
});
