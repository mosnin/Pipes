import { loadConfig } from "./config.js";
export class ApiError extends Error {
    code;
    requestId;
    constructor(code, message, requestId) {
        super(message);
        this.code = code;
        this.requestId = requestId;
        this.name = "ApiError";
    }
}
function assertToken(token) {
    if (!token) {
        throw new ApiError("AUTH_REQUIRED", "No token found. Set PIPES_TOKEN, add it to .pipes.yml, or run: pipes init");
    }
}
export class PipesClient {
    cfg;
    constructor(cfg) {
        this.cfg = cfg;
    }
    headers(extra = {}) {
        return {
            "content-type": "application/json",
            authorization: `Bearer ${this.cfg.token}`,
            ...extra,
        };
    }
    unwrap(res) {
        if (!res.ok || !res.data) {
            throw new ApiError(res.error?.code ?? "UNKNOWN", res.error?.message ?? "Request failed", res.error?.requestId);
        }
        return res.data;
    }
    async get(path) {
        assertToken(this.cfg.token);
        const res = await fetch(`${this.cfg.api}${path}`, {
            headers: this.headers(),
        });
        const body = (await res.json());
        return this.unwrap(body);
    }
    async getRaw(path) {
        assertToken(this.cfg.token);
        const res = await fetch(`${this.cfg.api}${path}`, {
            headers: this.headers(),
        });
        return res.json();
    }
    async post(path, body, opts = {}) {
        assertToken(this.cfg.token);
        const extra = {};
        if (opts.idempotencyKey)
            extra["idempotency-key"] = opts.idempotencyKey;
        const res = await fetch(`${this.cfg.api}${path}`, {
            method: "POST",
            headers: this.headers(extra),
            body: JSON.stringify(body),
        });
        const json = (await res.json());
        return this.unwrap(json);
    }
    async postRaw(path, body, opts = {}) {
        assertToken(this.cfg.token);
        const extra = {};
        if (opts.idempotencyKey)
            extra["idempotency-key"] = opts.idempotencyKey;
        const res = await fetch(`${this.cfg.api}${path}`, {
            method: "POST",
            headers: this.headers(extra),
            body: JSON.stringify(body),
        });
        return res.json();
    }
    async streamGet(path) {
        assertToken(this.cfg.token);
        const res = await fetch(`${this.cfg.api}${path}`, {
            headers: this.headers(),
        });
        if (!res.body) {
            process.stdout.write(await res.text());
            return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            process.stdout.write(decoder.decode(value, { stream: true }));
        }
    }
}
export function makeClient(overrides = {}) {
    return new PipesClient(loadConfig(overrides));
}
