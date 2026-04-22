import { getServerApp } from "@/lib/composition/server";

export async function getRequestContext() {
  const { ctx } = await getServerApp();
  return ctx;
}
