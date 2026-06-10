import { describe, expect, it } from "vitest";
import HomePage from "@/app/(marketing)/page";
import PricingPage from "@/app/(marketing)/pricing/page";
import NotFound from "@/app/not-found";
import BillingSettingsPage from "@/app/(app)/settings/billing/page";
import CollaborationSettingsPage from "@/app/(app)/settings/collaboration/page";
import TokensSettingsPage from "@/app/(app)/settings/tokens/page";
import AdminPage from "@/app/(app)/admin/page";
import AdminInsightsPage from "@/app/(app)/admin/insights/page";
import AdminReleasePage from "@/app/(app)/admin/release/page";
import AdminIssuesPage from "@/app/(app)/admin/issues/page";
import UseCasesPage from "@/app/(marketing)/use-cases/page";
import ComparePage from "@/app/(marketing)/compare/page";
import { EditorCanvas } from "@/components/editor/EditorCanvas";

describe("route smoke", () => {
  it("has home page component", () => {
    expect(HomePage).toBeTypeOf("function");
  });

  it("has pricing page component", () => {
    expect(PricingPage).toBeTypeOf("function");
  });

  it("has not found fallback component", () => {
    expect(NotFound).toBeTypeOf("function");
  });

  it("has settings pages", () => {
    expect(BillingSettingsPage).toBeTypeOf("function");
    expect(CollaborationSettingsPage).toBeTypeOf("function");
    expect(TokensSettingsPage).toBeTypeOf("function");
    expect(AdminPage).toBeTypeOf("function");
    expect(AdminInsightsPage).toBeTypeOf("function");
    expect(AdminReleasePage).toBeTypeOf("function");
    expect(AdminIssuesPage).toBeTypeOf("function");
    expect(EditorCanvas).toBeTypeOf("function");
    expect(UseCasesPage).toBeTypeOf("function");
    expect(ComparePage).toBeTypeOf("function");
  });
});
