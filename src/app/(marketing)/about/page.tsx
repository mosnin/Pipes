import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/MarketingShell";
import { CutButton } from "@/components/marketing/cut-button";
import { FinalCta } from "@/components/marketing/final-cta";
import { PageIntro } from "@/components/marketing/page-intro";
import { Container, Section, SectionHeading, SpecList } from "@/components/marketing/section";

/* ==========================================================================
   ABOUT, /about. Public.

   What Pipes is and who it is for, in plain words. No invented team, no
   invented customers, no address we cannot stand behind: the one contact
   route is the feedback form that already exists inside the app.
   ========================================================================== */

export const metadata: Metadata = {
  title: "About",
  description:
    "Pipes is where teams design, store and version the workflows their agents follow, and where agents run them one step at a time.",
};

export default function AboutPage() {
  return (
    <MarketingShell>
      <PageIntro
        kicker="About"
        title="Agents should follow the workflow you wrote."
        lead="Pipes is where teams design, store and version the workflows their agents follow, and where agents run them one step at a time. People decide the steps and sign off where it matters. Agents do the work. Pipes keeps track of both."
      >
        <div className="flex flex-wrap gap-4">
          <CutButton href="/signup?source=about">Start free workspace</CutButton>
          <CutButton href="/protocol" variant="outline">
            See how agents connect
          </CutButton>
        </div>
      </PageIntro>

      <Section className="pt-0" labelledBy="why-heading">
        <Container>
          <SectionHeading
            id="why-heading"
            kicker="Why it exists"
            title="Prompts are a poor place to keep a procedure."
            lead="Once agents do real work, the procedure matters as much as the model. Written into a prompt, it drifts, nobody reviews it, and nothing checks that the agent stopped for the approval. Pipes gives the procedure its own home, with versions, and holds the run so the steps happen in order."
          />
        </Container>
      </Section>

      <Section className="border-t border-hairline" labelledBy="who-heading">
        <Container>
          <SectionHeading id="who-heading" kicker="Who it is for" title="Teams that hand real work to agents." />
          <SpecList
            className="mt-10"
            rows={[
              {
                term: "Teams running agents",
                detail:
                  "Support, operations, research and engineering teams whose agents follow the same steps every time and need a person to sign off on some of them.",
              },
              {
                term: "Developers",
                detail:
                  "People wiring agents into their own systems, who want the procedure outside the code, a standard MCP server to call, and webhooks and schedules to start runs.",
              },
              {
                term: "Whoever is accountable",
                detail:
                  "The person who has to answer what an agent did and why. Every run keeps its steps, its outputs, its approvals and the version it followed.",
              },
            ]}
          />
        </Container>
      </Section>

      <Section className="border-t border-hairline" labelledBy="how-heading">
        <Container>
          <SectionHeading id="how-heading" kicker="How it works" title="Three parts, kept apart on purpose." />
          <SpecList
            className="mt-10"
            rows={[
              {
                term: "The workflow",
                detail:
                  "Steps, routes, loops with limits and human approvals, each step with instructions and a line that says when it is done. Edited in the browser, saved as versions.",
              },
              {
                term: "The run",
                detail:
                  "One pass through a workflow. Pipes freezes the version, hands out the current step, records what came back and decides where to go next.",
              },
              {
                term: "The agent",
                detail:
                  "Any MCP client, or a person in the app. Pipes does not execute steps itself; whoever runs the step does the work and reports it.",
              },
            ]}
          />
        </Container>
      </Section>

      <Section className="border-t border-hairline" labelledBy="contact-heading">
        <Container>
          <SectionHeading
            id="contact-heading"
            kicker="Get in touch"
            title="Tell us what is missing."
            lead={
              <>
                Once you have a workspace, send questions, bugs and requests from{" "}
                <Link href="/settings/feedback" className="t-link">
                  Settings, Feedback
                </Link>
                . Every message lands in the queue the people building Pipes work from.
              </>
            }
          />
        </Container>
      </Section>

      <FinalCta source="about_final" />
    </MarketingShell>
  );
}
