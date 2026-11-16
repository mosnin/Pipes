import crypto from "node:crypto";
import { hashAgentToken, issueAgentTokenSecret, type AgentCapability } from "@/lib/protocol/tokens";
import type { RepositorySet } from "@/lib/repositories/contracts";

const CLIENT_KIND = "oauth_client";
const CODE_KIND = "oauth_code";
const GLOBAL = "global";
const CODE_TTL_MS = 10 * 60 * 1000;

/** OAuth scopes map onto Pipes token capabilities. */
export const OAUTH_SCOPES: Record<string, { label: string; capabilities: AgentCapability[] }> = {
  pipes: {
    label: "Read your workflows and run them step by step",
    capabilities: ["systems:read", "schema:read", "templates:read", "templates:instantiate", "runs:read", "runs:write", "comments:write", "validation:read", "versions:read"]
  },
  "pipes:write": { label: "Edit your workflows", capabilities: ["graph:write", "versions:write", "import:write"] }
};
export const DEFAULT_SCOPE = "pipes";

export type OAuthClient = { clientId: string; clientName: string; redirectUris: string[]; createdAt: string };
type OAuthCode = { clientId: string; redirectUri: string; codeChallenge: string; scope: string; workspaceId: string; userId: string; resource?: string; expiresAt: number; used: boolean };

export class OAuthError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 400) {
    super(message);
  }
}

export function isAllowedRedirectUri(value: string): boolean {
  try {
    const url = new URL(value);
    if (["javascript:", "data:", "file:", "vbscript:"].includes(url.protocol)) return false;
    if (url.protocol === "http:") return url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
    return !url.hash;
  } catch {
    return false;
  }
}

export function normalizeScope(scope: string | null | undefined): string {
  const requested = (scope ?? "").split(/\s+/).filter((s) => s in OAUTH_SCOPES);
  const set = new Set([DEFAULT_SCOPE, ...requested]);
  return [...set].join(" ");
}

export function capabilitiesFor(scope: string): AgentCapability[] {
  return [...new Set(scope.split(" ").flatMap((s) => OAUTH_SCOPES[s]?.capabilities ?? []))];
}

function s256(verifier: string) {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

export function createOAuthService(repos: RepositorySet) {
  return {
    async register(input: { client_name?: string; redirect_uris?: unknown }): Promise<OAuthClient> {
      const uris = Array.isArray(input.redirect_uris) ? input.redirect_uris.map(String) : [];
      if (uris.length === 0 || uris.length > 10 || !uris.every(isAllowedRedirectUri)) {
        throw new OAuthError("invalid_redirect_uri", "redirect_uris must be 1 to 10 https URLs, loopback http URLs, or app schemes.");
      }
      const client: OAuthClient = {
        clientId: `pcl_${crypto.randomBytes(12).toString("base64url")}`,
        clientName: String(input.client_name ?? "MCP client").slice(0, 80),
        redirectUris: uris,
        createdAt: new Date().toISOString()
      };
      await repos.documents.put<OAuthClient>({ kind: CLIENT_KIND, id: client.clientId, workspaceId: GLOBAL, data: client });
      return client;
    },

    async getClient(clientId: string): Promise<OAuthClient | null> {
      return (await repos.documents.get<OAuthClient>(CLIENT_KIND, clientId))?.data ?? null;
    },

    /** Validate an authorization request before showing consent. */
    async validateAuthorizeRequest(params: URLSearchParams): Promise<{ client: OAuthClient; redirectUri: string; scope: string; state?: string; codeChallenge: string; resource?: string }> {
      const client = await this.getClient(params.get("client_id") ?? "");
      if (!client) throw new OAuthError("invalid_client", "This app is not registered with Pipes.");
      const redirectUri = params.get("redirect_uri") ?? "";
      if (!client.redirectUris.includes(redirectUri)) throw new OAuthError("invalid_request", "The redirect address does not match the app's registration.");
      if (params.get("response_type") !== "code") throw new OAuthError("unsupported_response_type", "Only the authorization code flow is supported.");
      const codeChallenge = params.get("code_challenge") ?? "";
      if (!codeChallenge || params.get("code_challenge_method") !== "S256") throw new OAuthError("invalid_request", "PKCE with S256 is required.");
      return { client, redirectUri, scope: normalizeScope(params.get("scope")), state: params.get("state") ?? undefined, codeChallenge, resource: params.get("resource") ?? undefined };
    },

    async issueCode(input: Omit<OAuthCode, "expiresAt" | "used">): Promise<string> {
      const code = crypto.randomBytes(32).toString("base64url");
      await repos.documents.put<OAuthCode>({ kind: CODE_KIND, id: s256(code), workspaceId: input.workspaceId, data: { ...input, expiresAt: Date.now() + CODE_TTL_MS, used: false } });
      return code;
    },

    /** Exchange a code for an access token (a revocable Pipes API token). */
    async exchangeCode(input: { code: string; clientId: string; redirectUri: string; codeVerifier: string }): Promise<{ access_token: string; token_type: "Bearer"; scope: string }> {
      const doc = await repos.documents.get<OAuthCode>(CODE_KIND, s256(input.code));
      const data = doc?.data;
      if (!doc || !data || data.used || data.expiresAt < Date.now()) throw new OAuthError("invalid_grant", "The authorization code is invalid or expired.");
      if (data.clientId !== input.clientId || data.redirectUri !== input.redirectUri) throw new OAuthError("invalid_grant", "The code was issued to a different client or redirect address.");
      if (s256(input.codeVerifier) !== data.codeChallenge) throw new OAuthError("invalid_grant", "PKCE verification failed.");
      await repos.documents.put<OAuthCode>({ kind: CODE_KIND, id: doc.id, workspaceId: doc.workspaceId, data: { ...data, used: true } });
      const client = await this.getClient(data.clientId);
      const secret = issueAgentTokenSecret();
      await repos.agentTokens.create({
        workspaceId: data.workspaceId,
        name: `${client?.clientName ?? "MCP client"} (OAuth)`,
        capabilities: capabilitiesFor(data.scope),
        tokenHash: hashAgentToken(secret),
        tokenPreview: `${secret.slice(0, 8)}…${secret.slice(-4)}`,
        createdByUserId: data.userId
      });
      return { access_token: secret, token_type: "Bearer", scope: data.scope };
    }
  };
}
