import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import yaml from "js-yaml";
const DEFAULT_API = "https://app.pipes.sh";
function findConfigFile(startDir) {
    let dir = startDir;
    while (true) {
        const candidate = join(dir, ".pipes.yml");
        if (existsSync(candidate))
            return candidate;
        const parent = dirname(dir);
        if (parent === dir)
            return null;
        dir = parent;
    }
}
export function loadConfig(overrides = {}) {
    let fileConfig = {};
    const configPath = findConfigFile(process.cwd());
    if (configPath) {
        try {
            const raw = readFileSync(configPath, "utf8");
            const parsed = yaml.load(raw);
            if (parsed && typeof parsed === "object") {
                fileConfig = parsed;
            }
        }
        catch {
            // silently ignore malformed config
        }
    }
    return {
        api: overrides.api ?? process.env["PIPES_API"] ?? fileConfig.api ?? DEFAULT_API,
        token: overrides.token ?? process.env["PIPES_TOKEN"] ?? fileConfig.token ?? "",
    };
}
export function configFilePath() {
    return join(process.cwd(), ".pipes.yml");
}
