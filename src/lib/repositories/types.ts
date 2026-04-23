import type { Role } from "@/domain/pipes_schema_v1/schema";

export type RuntimeContext = { userId: string; workspaceId: string; role: Role; plan: "Free" | "Pro" | "Builder" };

export interface RepositoryGateway {
  mode: "mock" | "convex";
}
