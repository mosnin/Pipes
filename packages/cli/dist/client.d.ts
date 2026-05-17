import { type PipesConfig } from "./config.js";
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
export declare class ApiError extends Error {
    readonly code: string;
    readonly requestId?: string | undefined;
    constructor(code: string, message: string, requestId?: string | undefined);
}
export declare class PipesClient {
    private readonly cfg;
    constructor(cfg: PipesConfig);
    private headers;
    private unwrap;
    get<T>(path: string): Promise<T>;
    getRaw<T>(path: string): Promise<ApiResponse<T>>;
    post<T>(path: string, body: unknown, opts?: {
        idempotencyKey?: string;
    }): Promise<T>;
    postRaw<T>(path: string, body: unknown, opts?: {
        idempotencyKey?: string;
    }): Promise<ApiResponse<T>>;
    streamGet(path: string): Promise<void>;
}
export declare function makeClient(overrides?: Partial<PipesConfig>): PipesClient;
