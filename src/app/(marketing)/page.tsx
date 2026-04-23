import { Card, PageHeader, SectionHeader, Button } from "@/components/ui";
import { publicContentService } from "@/domain/services/public";
import { TrackedLink } from "@/components/marketing/TrackedLink";

export const metadata = {
  title: "Pipes · Systems, not diagrams",
  description: "Model reusable, validated, protocol-ready systems for humans and agents."
};

export default function HomePage() {
  const home = publicContentService.getHome();
  const templates = publicContentService.listTemplates().slice(0, 3);
  const useCases = publicContentService.listUseCases().slice(0, 3);

  return (
    <div>
      <section className="hero">
        <PageHeader
          title={home.hero.title}
          subtitle={home.hero.subtitle}
          actions={<div className="nav-inline"><TrackedLink href={home.hero.primaryCta.href} event="homepage_cta_clicked" metadata={{ location: "hero_primary" }}><Button>{home.hero.primaryCta.label}</Button></TrackedLink><TrackedLink href={home.hero.secondaryCta.href} event="homepage_cta_clicked" metadata={{ location: "hero_secondary" }}><Button>{home.hero.secondaryCta.label}</Button></TrackedLink></div>}
        />
        <p>Pipes gives technical teams a single system source for design, review, simulation, and integration handoff.</p>
      </section>

      <section>
        <SectionHeader title="Capabilities" description="Built for operational system memory, not only visual sketches." />
        <div className="grid-2" style={{ marginTop: 12 }}>
          {home.proof.map((item) => <Card key={item.title}><h3>{item.title}</h3><p>{item.body}</p></Card>)}
        </div>
      </section>

      <section style={{ marginTop: 24 }}>
        <SectionHeader title="Workflow" description={home.workflow.join(" → ")} />
        <Card><p>Capture architecture once, then reuse across collaboration, AI-assisted iteration, protocol integration, and onboarding handoff.</p></Card>
      </section>

      <section style={{ marginTop: 24 }}>
        <SectionHeader title="Templates and use cases" description="Start from proven system patterns." />
        <div className="grid-2">
          <Card><h4>Popular templates</h4>{templates.map((t) => <p key={t.id}><TrackedLink href={`/templates/${t.slug}`} event="template_detail_viewed" metadata={{ source: "home" }}>{t.title}</TrackedLink> · {t.preview}</p>)}</Card>
          <Card><h4>Use cases</h4>{useCases.map((u) => <p key={u.slug}><TrackedLink href={`/use-cases/${u.slug}`} event="use_case_viewed" metadata={{ source: "home" }}>{u.title}</TrackedLink></p>)}</Card>
        </div>
      </section>

      <section style={{ marginTop: 24 }}>
        <SectionHeader title="Protocol and developer workflow" description="Schema-first exports and MCP/REST pathways for integration teams." />
        <Card><TrackedLink href="/protocol" event="protocol_docs_viewed" metadata={{ source: "home" }}>Explore protocol docs and examples</TrackedLink></Card>
      </section>

      <section style={{ marginTop: 24 }}>
        <Card>
          <SectionHeader title="Pricing and rollout" description="Start free, upgrade when collaboration and protocol scale require it." />
          <div className="nav-inline"><TrackedLink href="/pricing" event="pricing_cta_clicked" metadata={{ source: "home" }}><Button>View pricing</Button></TrackedLink></div>
        </Card>
      </section>

      <section style={{ marginTop: 24 }}>
        <Card>
          <SectionHeader title="Ready to model real systems?" description="Create a workspace and start from templates, AI generation, or import." />
          <TrackedLink href={home.finalCta.href} event="homepage_cta_clicked" metadata={{ location: "final_cta" }}><Button>{home.finalCta.label}</Button></TrackedLink>
        </Card>
      </section>
    </div>
  );
}
