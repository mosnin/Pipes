import { describe, expect, it } from "vitest";
import { createMockRepositories } from "@/lib/repositories/mock";
import { createConvexRepositories } from "@/lib/repositories/convex";

describe("repository contract parity", () => {
  it("mock and convex expose the same repository boundaries", () => {
    const mock = createMockRepositories();
    const convex = createConvexRepositories();

    expect(Object.keys(mock).sort()).toEqual(Object.keys(convex).sort());
    expect(Object.keys(mock.systems).sort()).toEqual(Object.keys(convex.systems).sort());
    expect(Object.keys(mock.graph).sort()).toEqual(Object.keys(convex.graph).sort());
    expect(Object.keys(mock.versions).sort()).toEqual(Object.keys(convex.versions).sort());
  });
});
