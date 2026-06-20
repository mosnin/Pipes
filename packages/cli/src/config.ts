import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import yaml from "js-yaml";

export interface LooperConfig {
  api: string;
  token: string;
  memory_system_id?: string;
}

const DEFAULT_API = "https://app.looper.dev";

function findConfigFile(startDir: string): string | null {
  let dir = startDir;
  while (true) {
    const candidate = join(dir, ".looper.yml");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export function loadConfig(overrides: Partial<LooperConfig> = {}): LooperConfig {
  let fileConfig: Partial<LooperConfig> = {};

  const configPath = findConfigFile(process.cwd());
  if (configPath) {
    try {
      const raw = readFileSync(configPath, "utf8");
      const parsed = yaml.load(raw);
      if (parsed && typeof parsed === "object") {
        fileConfig = parsed as Partial<LooperConfig>;
      }
    } catch (err) {
      process.stderr.write(`Warning: malformed .looper.yml at ${configPath} — using defaults. (${err instanceof Error ? err.message : String(err)})\n`);
    }
  }

  return {
    api: overrides.api ?? process.env["LOOPER_API"] ?? fileConfig.api ?? DEFAULT_API,
    token: overrides.token ?? process.env["LOOPER_TOKEN"] ?? fileConfig.token ?? "",
    memory_system_id: overrides.memory_system_id ?? process.env["LOOPER_MEMORY_SYSTEM"] ?? (fileConfig as { memory_system_id?: string }).memory_system_id,
  };
}

export function configFilePath(): string {
  return join(process.cwd(), ".looper.yml");
}
