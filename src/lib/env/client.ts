export const clientRuntimeFlags = {
  useMocks: process.env.NEXT_PUBLIC_LOOPER_USE_MOCKS !== "false",
  hasConvex: Boolean(process.env.NEXT_PUBLIC_CONVEX_URL)
};
