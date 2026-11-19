// @ts-nocheck
/**
 * The bridge between Better Auth (running in the Next server) and its tables
 * in the Better Auth component. Every function needs Pipes' server key, like
 * the rest of convex/ (see lib.ts), so the Convex URL alone gives nobody
 * access to accounts, sessions or two-step secrets.
 */
import { v } from "convex/values";
import { components } from "./_generated/api";
import { mutation, query } from "./lib";

const a = components.betterAuth.adapter;
const input = { input: v.any() };

export const findOne = query({ args: input, handler: (ctx, { input }) => ctx.runQuery(a.findOne, input) });
export const findMany = query({ args: input, handler: (ctx, { input }) => ctx.runQuery(a.findMany, input) });
export const create = mutation({ args: input, handler: (ctx, { input }) => ctx.runMutation(a.create, input) });
export const updateOne = mutation({ args: input, handler: (ctx, { input }) => ctx.runMutation(a.updateOne, input) });
export const updateMany = mutation({ args: input, handler: (ctx, { input }) => ctx.runMutation(a.updateMany, input) });
export const deleteOne = mutation({ args: input, handler: (ctx, { input }) => ctx.runMutation(a.deleteOne, input) });
export const deleteMany = mutation({ args: input, handler: (ctx, { input }) => ctx.runMutation(a.deleteMany, input) });
export const consumeOne = mutation({ args: input, handler: (ctx, { input }) => ctx.runMutation(a.consumeOne, input) });
export const incrementOne = mutation({ args: input, handler: (ctx, { input }) => ctx.runMutation(a.incrementOne, input) });
