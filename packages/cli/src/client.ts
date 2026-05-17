import { loadConfig, type PipesConfig } from "./config.js";

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
      "No token found. Set PIPES_TOKEN, add it to .pipes.yml, or run: pipes init"
    );
  }
}

export class PipesClient {
  constructor(private readonly cfg: PipesConfig) {}

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
    assertToken(this.cfg.token);
    const res = await fetch(`${this.cfg.api}${path}`, {
      headers: this.headers(),
    });
    const body = (await res.json()) as ApiResponse<T>;
    return this.unwrap(body);
  }

  async getRaw<T>(path: string): Promise<ApiResponse<T>> {
    assertToken(this.cfg.token);
    const res = await fetch(`${this.cfg.api}${path}`, {
      headers: this.headers(),
    });
    return res.json() as Promise<ApiResponse<T>>;
  }

  async postRaw<T>(
    path: string,
    body: unknown,
    opts: { idempotencyKey?: string } = {}
  ): Promise<ApiResponse<T>> {
    assertToken(this.cfg.token);
    const extra: Record<string, string> = {};
    if (opts.idempotencyKey) extra["idempotency-key"] = opts.idempotencyKey;
    const res = await fetch(`${this.cfg.api}${path}`, {
      method: "POST",
      headers: this.headers(extra),
      body: JSON.stringify(body),
    });
    return res.json() as Promise<ApiResponse<T>>;
  }

}

export function makeClient(overrides: Partial<PipesConfig> = {}): PipesClient {
  return new PipesClient(loadConfig(overrides));
}
