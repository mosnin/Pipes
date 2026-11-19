import { createApi } from "@convex-dev/better-auth";
import schema from "./schema";
import { authSchemaOptions } from "../../src/lib/auth/schema-options";

/** The component's database functions, used only through convex/authBridge.ts. */
export const { create, findOne, findMany, updateOne, updateMany, deleteOne, deleteMany, consumeOne, incrementOne } = createApi(schema, () => authSchemaOptions as never);
