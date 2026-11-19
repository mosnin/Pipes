/**
 * Guard: toasts are Ding, always, as in Podium (docs/DESIGN.md, Toasts).
 * Show one with `useToast()` from `@/components/ui/toast`, which goes through
 * `src/lib/toast.tsx`. No other file imports Ding, and no other toast library
 * comes back. Changing this is a product decision: update the guard and
 * docs/DESIGN.md together.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const src = join(root, "src");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return files(p);
    return /\.(tsx?|jsx?)$/.test(name) ? [p] : [];
  });
}

describe("toasts are Ding", () => {
  it("keeps Ding as a dependency and no other toast library", () => {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(deps["@yusufceng1z/ding-react"]).toBeTruthy();
    for (const other of ["sonner", "react-hot-toast", "react-toastify", "notistack"]) expect(deps[other], other).toBeUndefined();
  });

  it("imports Ding only from src/lib/toast.tsx", () => {
    const offenders = files(src)
      .filter((f) => relative(src, f) !== "lib/toast.tsx")
      .filter((f) => /from ["']@yusufceng1z\/ding|from ["'](sonner|react-hot-toast|react-toastify)["']/.test(readFileSync(f, "utf8")))
      .map((f) => relative(src, f));
    expect(offenders).toEqual([]);
  });

  it("mounts the toaster in the app shell", () => {
    expect(readFileSync(join(src, "components/shell/app-shell.tsx"), "utf8")).toContain("ToastProvider");
    expect(readFileSync(join(src, "components/ui/toast.tsx"), "utf8")).toContain("PodiumToaster");
  });
});
