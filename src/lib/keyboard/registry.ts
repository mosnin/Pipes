// Keyboard shortcut registry
//
// A single Map<id, Shortcut> that any component can register against. The
// first registration wires a `keydown` listener on `window`; the listener is
// torn down when the registry empties. Registration is idempotent on `id`,
// re-registering the same id replaces the previous handler.
//
// Combo grammar: tokens joined by `+`, in any order. Tokens recognised:
//   modifiers: cmd, meta, ctrl, mod, shift, alt, option
//   keys:      single printable character, plus a small named-key alphabet
//              (esc, escape, tab, enter, space, up, down, left, right, slash,
//              question, plus, minus, comma, period, backslash, /, ?).
// `mod` resolves to cmd on Mac and ctrl elsewhere — same as `cmd+k` semantics
// in the spec. `cmd` and `meta` are aliases.

export type ShortcutScope = "global" | "editor" | "drawer";

export type Shortcut = {
  id: string;
  combo: string;
  label: string;
  group: string;
  scope?: ShortcutScope;
  handler: () => void;
};

type ParsedCombo = {
  meta: boolean;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  key: string; // already lower-cased canonical form
};

const KEY_ALIAS: Record<string, string> = {
  esc: "escape",
  escape: "escape",
  return: "enter",
  enter: "enter",
  space: " ",
  spacebar: " ",
  up: "arrowup",
  down: "arrowdown",
  left: "arrowleft",
  right: "arrowright",
  arrowup: "arrowup",
  arrowdown: "arrowdown",
  arrowleft: "arrowleft",
  arrowright: "arrowright",
  slash: "/",
  question: "?",
  plus: "+",
  minus: "-",
  comma: ",",
  period: ".",
  dot: ".",
  backslash: "\\",
  tab: "tab",
  delete: "delete",
  backspace: "backspace",
};

// Detect Mac. We accept the deprecated `navigator.platform` fallback. SSR is
// safe — typeof navigator is "undefined", so we treat the host as non-Mac
// and resolve `mod` to ctrl, which only matters in the browser anyway.
export function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  // Newer userAgentData (not always available)
  const uaData = (navigator as unknown as { userAgentData?: { platform?: string } }).userAgentData;
  const platform = (uaData?.platform ?? navigator.platform ?? "").toString();
  return /mac/i.test(platform);
}

export function parseCombo(combo: string): ParsedCombo {
  const tokens = combo
    .toLowerCase()
    .split("+")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  let meta = false;
  let ctrl = false;
  let shift = false;
  let alt = false;
  let key = "";

  const isMac = isMacPlatform();

  for (const tok of tokens) {
    if (tok === "cmd" || tok === "meta") meta = true;
    else if (tok === "ctrl" || tok === "control") ctrl = true;
    else if (tok === "mod") {
      if (isMac) meta = true;
      else ctrl = true;
    } else if (tok === "shift") shift = true;
    else if (tok === "alt" || tok === "option" || tok === "opt") alt = true;
    else key = KEY_ALIAS[tok] ?? tok;
  }
  return { meta, ctrl, shift, alt, key };
}

function eventToCombo(e: KeyboardEvent): ParsedCombo {
  // Normalize event.key to lower-case; preserve printable symbol keys as-is.
  const raw = (e.key ?? "").toLowerCase();
  const key = KEY_ALIAS[raw] ?? raw;
  return {
    meta: e.metaKey,
    ctrl: e.ctrlKey,
    shift: e.shiftKey,
    alt: e.altKey,
    key,
  };
}

function comboMatches(want: ParsedCombo, got: ParsedCombo): boolean {
  if (want.meta !== got.meta) return false;
  if (want.ctrl !== got.ctrl) return false;
  if (want.alt !== got.alt) return false;
  // For shift, allow event-shift when the want-key is a shifted symbol
  // (e.g. `?` is Shift+/). We only enforce the explicit shift modifier when
  // the registered combo's key is a *non-shifted* alphanumeric.
  if (want.shift && !got.shift) return false;
  if (!want.shift && got.shift && /^[a-z0-9]$/.test(want.key)) return false;
  return want.key === got.key;
}

const registry = new Map<string, Shortcut>();
let listenerAttached = false;

function onWindowKeyDown(e: KeyboardEvent): void {
  // Ignore shortcuts while the user is typing in a text field, with two
  // exceptions: cmd/ctrl-prefixed shortcuts and Escape always run. This keeps
  // `?`, `/`, single-letter shortcuts from firing while the user is typing.
  const target = e.target as HTMLElement | null;
  const tag = target?.tagName?.toLowerCase();
  const isEditable =
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    target?.isContentEditable === true;
  const got = eventToCombo(e);
  const allowInEditable = got.meta || got.ctrl || got.key === "escape";
  if (isEditable && !allowInEditable) return;

  for (const sc of registry.values()) {
    const want = parseCombo(sc.combo);
    if (comboMatches(want, got)) {
      e.preventDefault();
      try {
        sc.handler();
      } catch {
        // Handlers are user code; never let one break the listener.
      }
      return;
    }
  }
}

function ensureListener(): void {
  if (listenerAttached) return;
  if (typeof window === "undefined") return;
  window.addEventListener("keydown", onWindowKeyDown);
  listenerAttached = true;
}

function maybeDetachListener(): void {
  if (!listenerAttached) return;
  if (registry.size > 0) return;
  if (typeof window === "undefined") return;
  window.removeEventListener("keydown", onWindowKeyDown);
  listenerAttached = false;
}

export function register(s: Shortcut): () => void {
  registry.set(s.id, s);
  ensureListener();
  return () => {
    const current = registry.get(s.id);
    // Only delete if the entry is still ours; replacing via a later register()
    // call should win — its own returned unregister handles teardown.
    if (current === s) {
      registry.delete(s.id);
      maybeDetachListener();
    }
  };
}

export function unregister(id: string): void {
  registry.delete(id);
  maybeDetachListener();
}

export function list(): Shortcut[] {
  return Array.from(registry.values());
}

export function dispatch(combo: string, scope?: ShortcutScope): boolean {
  const want = parseCombo(combo);
  for (const sc of registry.values()) {
    if (scope && sc.scope && sc.scope !== scope) continue;
    const got = parseCombo(sc.combo);
    if (
      got.meta === want.meta &&
      got.ctrl === want.ctrl &&
      got.shift === want.shift &&
      got.alt === want.alt &&
      got.key === want.key
    ) {
      try {
        sc.handler();
      } catch {
        // swallow
      }
      return true;
    }
  }
  return false;
}

// Test-only: clear all registered shortcuts and detach the global listener.
export function _resetRegistry(): void {
  registry.clear();
  maybeDetachListener();
}

// Render a combo string as user-friendly capsule labels. Returns an array of
// short symbols, e.g. ["⌘", "K"] on Mac or ["Ctrl", "K"] on Windows.
export function comboToKeys(combo: string): string[] {
  const parsed = parseCombo(combo);
  const isMac = isMacPlatform();
  const out: string[] = [];
  if (parsed.meta) out.push(isMac ? "⌘" : "Cmd");
  if (parsed.ctrl) out.push(isMac ? "⌃" : "Ctrl");
  if (parsed.alt) out.push(isMac ? "⌥" : "Alt");
  if (parsed.shift) out.push(isMac ? "⇧" : "Shift");
  if (parsed.key) {
    const k = parsed.key;
    if (k === "escape") out.push("Esc");
    else if (k === "enter") out.push("Enter");
    else if (k === " ") out.push("Space");
    else if (k === "arrowup") out.push("↑");
    else if (k === "arrowdown") out.push("↓");
    else if (k === "arrowleft") out.push("←");
    else if (k === "arrowright") out.push("→");
    else out.push(k.length === 1 ? k.toUpperCase() : k);
  }
  return out;
}
