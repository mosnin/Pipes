// @ts-nocheck
import { mutation, query } from "./lib";
import { v } from "convex/values";

const now = () => new Date().toISOString();

type Row = { kind: string; docId: string; workspaceId: string; refId?: string; data: unknown; createdAt: string; updatedAt: string };
const shape = (row: Row) => ({ kind: row.kind, id: row.docId, workspaceId: row.workspaceId, refId: row.refId, data: row.data, createdAt: row.createdAt, updatedAt: row.updatedAt });

export const get = query({
  args: { kind: v.string(), id: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db.query("documents").withIndex("by_kind_doc", (q) => q.eq("kind", args.kind).eq("docId", args.id)).first();
    return row ? shape(row) : null;
  }
});

export const put = mutation({
  args: { kind: v.string(), id: v.string(), workspaceId: v.string(), refId: v.optional(v.string()), data: v.any() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("documents").withIndex("by_kind_doc", (q) => q.eq("kind", args.kind).eq("docId", args.id)).first();
    const ts = now();
    if (existing) {
      await ctx.db.patch(existing._id, { workspaceId: args.workspaceId, refId: args.refId, data: args.data, updatedAt: ts });
      return shape({ ...existing, workspaceId: args.workspaceId, refId: args.refId, data: args.data, updatedAt: ts });
    }
    const row = { kind: args.kind, docId: args.id, workspaceId: args.workspaceId, refId: args.refId, data: args.data, createdAt: ts, updatedAt: ts };
    await ctx.db.insert("documents", row);
    return shape(row);
  }
});

export const list = query({
  args: { kind: v.string(), workspaceId: v.optional(v.string()), refId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const rows = args.refId
      ? await ctx.db.query("documents").withIndex("by_kind_ref", (q) => q.eq("kind", args.kind).eq("refId", args.refId)).collect()
      : args.workspaceId
        ? await ctx.db.query("documents").withIndex("by_kind_workspace", (q) => q.eq("kind", args.kind).eq("workspaceId", args.workspaceId!)).collect()
        : await ctx.db.query("documents").withIndex("by_kind_doc", (q) => q.eq("kind", args.kind)).collect();
    return rows.filter((r) => !args.workspaceId || r.workspaceId === args.workspaceId).map(shape);
  }
});

export const remove = mutation({
  args: { kind: v.string(), id: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db.query("documents").withIndex("by_kind_doc", (q) => q.eq("kind", args.kind).eq("docId", args.id)).first();
    if (row) await ctx.db.delete(row._id);
  }
});
