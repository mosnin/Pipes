import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import yaml from "js-yaml";

export interface PipesConfig {
  api: string;
  token: string;
  memory_system_id?: string;
}

const DEFAULT_API = "https://app.pipes.sh";

function findConfigFile(startDir: string): string | null {
  let dir = startDir;
  while (true) {
    const candidate = join(dir, ".pipes.yml");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export function loadConfig(overrides: Partial<PipesConfig> = {}): PipesConfig {
  let fileConfig: Partial<PipesConfig> = {};

  const configPath = findConfigFile(process.cwd());
  if (configPath) {
    try {
      const raw = readFileSync(configPath, "utf8");
      const parsed = yaml.load(raw);
      if (parsed && typeof parsed === "object") {
        fileConfig = parsed as Partial<PipesConfig>;
      }
    } catch (err) {
      process.stderr.write(`Warning: malformed .pipes.yml at ${configPath} — using defaults. (${err instanceof Error ? err.message : String(err)})\n`);
    }
  }

  return {
    api: overrides.api ?? process.env["PIPES_API"] ?? fileConfig.api ?? DEFAULT_API,
    token: overrides.token ?? process.env["PIPES_TOKEN"] ?? fileConfig.token ?? "",
    memory_system_id: overrides.memory_system_id ?? process.env["PIPES_MEMORY_SYSTEM"] ?? (fileConfig as { memory_system_id?: string }).memory_system_id,
  };
}

export function configFilePath(): string {
  return join(process.cwd(), ".pipes.yml");
}
