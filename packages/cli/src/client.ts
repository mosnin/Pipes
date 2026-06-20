import { loadConfig, type LooperConfig } from "./config.js";
import { withSpan } from "./telemetry.js";

export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    requestId?: string;
    details?: Record<string, unknown>;
  };
  requestId?: string;
  replayed?: boolean;
}

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly requestId?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function assertToken(token: string) {
  if (!token) {
    throw new ApiError(
      "AUTH_REQUIRED",
      "No token found. Set LOOPER_TOKEN, add it to .looper.yml, or run: looper init"
    );
  }
}

export class LooperClient {
  constructor(private readonly cfg: LooperConfig) {}

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      "content-type": "application/json",
      authorization: `Bearer ${this.cfg.token}`,
      ...extra,
    };
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.ok || !res.data) {
      throw new ApiError(
        res.error?.code ?? "UNKNOWN",
        res.error?.message ?? "Request failed",
        res.error?.requestId
      );
    }
    return res.data;
  }

  async get<T>(path: string): Promise<T> {
    return withSpan("looper.api.get", { "http.method": "GET", "http.path": path }, async () => {
      assertToken(this.cfg.token);
      const res = await fetch(`${this.cfg.api}${path}`, {
        headers: this.headers(),
      });
      const body = (await res.json()) as ApiResponse<T>;
      return this.unwrap(body);
    });
  }

  async getRaw<T>(path: string): Promise<ApiResponse<T>> {
    return withSpan("looper.api.get_raw", { "http.method": "GET", "http.path": path }, async () => {
      assertToken(this.cfg.token);
      const res = await fetch(`${this.cfg.api}${path}`, {
        headers: this.headers(),
      });
      return res.json() as Promise<ApiResponse<T>>;
    });
  }

  async postRaw<T>(
    path: string,
    body: unknown,
    opts: { idempotencyKey?: string } = {}
  ): Promise<ApiResponse<T>> {
    return withSpan("looper.api.post", { "http.method": "POST", "http.path": path }, async () => {
      assertToken(this.cfg.token);
      const extra: Record<string, string> = {};
      if (opts.idempotencyKey) extra["idempotency-key"] = opts.idempotencyKey;
      const res = await fetch(`${this.cfg.api}${path}`, {
        method: "POST",
        headers: this.headers(extra),
        body: JSON.stringify(body),
      });
      return res.json() as Promise<ApiResponse<T>>;
    });
  }

}

export function makeClient(overrides: Partial<LooperConfig> = {}): LooperClient {
  return new LooperClient(loadConfig(overrides));
}
