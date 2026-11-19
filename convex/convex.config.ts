import { defineApp } from "convex/server";
import betterAuth from "./betterAuth/convex.config";

/** Pipes' Convex app, with Better Auth's tables as a component (docs/security.md). */
const app = defineApp();
app.use(betterAuth);
export default app;
