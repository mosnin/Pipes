import { describe, expect, it } from "vitest";
import HomePage from "@/app/(marketing)/page";
import TemplatesPage from "@/app/(marketing)/templates/page";
import UseCasesPage from "@/app/(marketing)/use-cases/page";
import CompareIndexPage from "@/app/(marketing)/compare/page";

describe("marketing route rendering", () => {
  it("exports key public page components", () => {
    expect(HomePage).toBeTypeOf("function");
    expect(TemplatesPage).toBeTypeOf("function");
    expect(UseCasesPage).toBeTypeOf("function");
    expect(CompareIndexPage).toBeTypeOf("function");
  });
});
