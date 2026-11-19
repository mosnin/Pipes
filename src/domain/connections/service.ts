import crypto from "node:crypto";
import type { RepositorySet } from "@/lib/repositories/contracts";

export const CONNECTION_KIND = "connection";

export type ConnectionType = "mcp" | "http" | "skill";

type StoredConnection = {
  name: string;
  type: ConnectionType;
  url: string;
  description?: string;
  /** Header the secret is sent in, e.g. Authorization or X-Api-Key. */
  headerName?: string;
  /** AES-256-GCM ciphertext of the secret: iv.tag.data, base64url. */
  secretCiphertext?: string;
  secretPreview?: string;
  createdBy: string;
};

export type ConnectionView = { id: string; name: string; type: ConnectionType; url: string; description?: string; headerName?: string; hasSecret: boolean; secretPreview?: string; createdAt: string };

/** What a step's performer receives. The secret is only included for tokens allowed to read it. */
export type ResolvedConnection = ConnectionView & { headers?: Record<string, string> };

function encryptionKey(): Buffer {
  const material = process.env.PIPES_ENCRYPTION_KEY || process.env.PIPES_SESSION_SECRET || "pipes-dev-only-encryption-key";
  if (process.env.NODE_ENV === "production" && !process.env.PIPES_ENCRYPTION_KEY && !process.env.PIPES_SESSION_SECRET) {
    throw new Error("PIPES_ENCRYPTION_KEY (or PIPES_SESSION_SECRET) is required to store connection secrets in production.");
  }
  return crypto.createHash("sha256").update(`pipes-connections:${material}`).digest();
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64url")).join(".");
}

export function decryptSecret(payload: string): string {
  const [iv, tag, data] = payload.split(".").map((p) => Buffer.from(p, "base64url"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

function view(id: string, createdAt: string, c: StoredConnection): ConnectionView {
  return { id, name: c.name, type: c.type, url: c.url, description: c.description, headerName: c.headerName, hasSecret: Boolean(c.secretCiphertext), secretPreview: c.secretPreview, createdAt };
}

function validUrl(type: ConnectionType, value: string): boolean {
  if (type === "skill" && !/^https?:/i.test(value)) return value.trim().length > 0; // a skill may be a name
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function createConnectionService(repos: RepositorySet) {
  return {
    async list(workspaceId: string): Promise<ConnectionView[]> {
      const docs = await repos.documents.list<StoredConnection>(CONNECTION_KIND, { workspaceId });
      return docs.map((d) => view(d.id, d.createdAt, d.data)).sort((a, b) => a.name.localeCompare(b.name));
    },

    async create(workspaceId: string, createdBy: string, input: { name: string; type: ConnectionType; url: string; description?: string; headerName?: string; secret?: string }): Promise<ConnectionView> {
      const name = input.name.trim();
      if (!name) throw new Error("Give the connection a name.");
      if (!["mcp", "http", "skill"].includes(input.type)) throw new Error("Choose MCP server, HTTP API or skill.");
      if (!validUrl(input.type, input.url)) throw new Error("Enter a valid URL.");
      const secret = input.secret?.trim();
      const data: StoredConnection = {
        name,
        type: input.type,
        url: input.url.trim(),
        description: input.description?.trim() || undefined,
        headerName: secret ? input.headerName?.trim() || "Authorization" : undefined,
        secretCiphertext: secret ? encryptSecret(secret) : undefined,
        secretPreview: secret ? `…${secret.slice(-4)}` : undefined,
        createdBy
      };
      const id = `con_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
      const doc = await repos.documents.put<StoredConnection>({ kind: CONNECTION_KIND, id, workspaceId, data });
      return view(id, doc.createdAt, data);
    },

    async remove(workspaceId: string, id: string) {
      const doc = await repos.documents.get<StoredConnection>(CONNECTION_KIND, id);
      if (!doc || doc.workspaceId !== workspaceId) throw new Error("Connection not found.");
      await repos.documents.remove(CONNECTION_KIND, id);
    },

    /** Resolve connection ids for a step payload. Secrets only when `withSecrets`. Unknown ids are dropped. */
    async resolve(workspaceId: string, ids: string[], withSecrets: boolean): Promise<ResolvedConnection[]> {
      const out: ResolvedConnection[] = [];
      for (const id of ids) {
        const doc = await repos.documents.get<StoredConnection>(CONNECTION_KIND, id);
        if (!doc || doc.workspaceId !== workspaceId) continue;
        const base = view(doc.id, doc.createdAt, doc.data);
        if (withSecrets && doc.data.secretCiphertext && doc.data.headerName) {
          const secret = decryptSecret(doc.data.secretCiphertext);
          const value = doc.data.headerName.toLowerCase() === "authorization" && !/^\w+\s/.test(secret) ? `Bearer ${secret}` : secret;
          out.push({ ...base, headers: { [doc.data.headerName]: value } });
        } else {
          out.push(base);
        }
      }
      return out;
    }
  };
}

export type ConnectionService = ReturnType<typeof createConnectionService>;
