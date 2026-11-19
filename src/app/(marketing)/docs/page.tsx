import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/MarketingShell";
import { TrackedLink } from "@/components/marketing/TrackedLink";
import { FinalCta } from "@/components/marketing/final-cta";
import { PageIntro } from "@/components/marketing/page-intro";
import { Container, Section, SectionHeading, SpecList } from "@/components/marketing/section";

export const metadata: Metadata = {
  title: "Docs",
  description:
    "Where to read about Pipes: connecting agents over MCP, the run loop, the REST API, templates and plans, plus the guides that ship with the source.",
};

export default function DocsPage() {
  return (
    <MarketingShell>
      <PageIntro
        kicker="Docs"
        title="Read about Pipes."
        lead="The reference for connecting agents and calling Pipes from code is on this site. Longer guides, from local development to the domain model, ship with the source in its docs folder."
      />

      <Section className="pt-0" labelledBy="site-heading">
        <Container className="flex flex-col gap-10">
          <SectionHeading id="site-heading" kicker="On this site" title="Start here." />
          <SpecList
            className="max-w-[860px]"
            rows={[
              {
                term: "Connect an agent",
                detail: (
                  <>
                    The MCP server URL, signing in with OAuth, and API tokens for clients without it.{" "}
                    <TrackedLink
                      href="/protocol#connect"
                      event="protocol_docs_viewed"
                      metadata={{ source: "docs_page" }}
                      className="t-link"
                    >
                      Connect an agent
                    </TrackedLink>
                  </>
                ),
              },
              {
                term: "The run loop",
                detail: (
                  <>
                    How an agent starts a run, does each step and reports it until the run is done.{" "}
                    <Link href="/protocol#runs" className="t-link">
                      Read the run loop
                    </Link>
                  </>
                ),
              },
              {
                term: "MCP tools",
                detail: (
                  <>
                    Every tool on the MCP server and the capability it needs.{" "}
                    <Link href="/protocol#mcp" className="t-link">
                      See the tools
                    </Link>
                  </>
                ),
              },
              {
                term: "REST API",
                detail: (
                  <>
                    Reading and editing workflows from code, idempotency, rate limits and errors.{" "}
                    <Link href="/protocol#rest" className="t-link">
                      See the routes
                    </Link>
                  </>
                ),
              },
              {
                term: "Templates",
                detail: (
                  <>
                    Each starter template, its steps and its size.{" "}
                    <Link href="/templates" className="t-link">
                      Browse templates
                    </Link>
                  </>
                ),
              },
              {
                term: "Plans",
                detail: (
                  <>
                    What each plan includes, read from the same limits the app enforces.{" "}
                    <Link href="/pricing" className="t-link">
                      Compare plans
                    </Link>
                  </>
                ),
              },
            ]}
          />
        </Container>
      </Section>

      <Section className="border-t border-hairline" labelledBy="repo-heading">
        <Container className="flex flex-col gap-10">
          <SectionHeading
            id="repo-heading"
            kicker="With the source"
            title="Guides in the docs folder."
            lead="These live next to the code they describe, so they change in the same commit."
          />
          <SpecList
            className="max-w-[860px]"
            rows={[
              { term: "docs/mcp.md", detail: "The MCP server: authentication, the run loop and every tool.", mono: true },
              { term: "docs/protocol.md", detail: "The REST API, tokens and idempotency, with request examples.", mono: true },
              { term: "docs/product_overview.md", detail: "What Pipes does today, feature by feature.", mono: true },
              { term: "docs/errors.md", detail: "Every REST error code.", mono: true },
              { term: "docs/openapi", detail: "The OpenAPI description of the REST routes.", mono: true },
              { term: "docs/domain_model.md", detail: "The canonical schema, templates and how AI drafts are reviewed before they commit.", mono: true },
              { term: "docs/local_development.md", detail: "Running Pipes locally in mock mode.", mono: true },
            ]}
          />
        </Container>
      </Section>

      <FinalCta source="docs_final" />
    </MarketingShell>
  );
}
