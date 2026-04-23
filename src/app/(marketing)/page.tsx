import { Card, Button } from "@/components/ui";
import { publicContentService } from "@/domain/services/public";
import { TrackedLink } from "@/components/marketing/TrackedLink";

export const metadata = {
  title: "Pipes · System design with an agent",
  description: "Design systems with an attached agent. Review structure changes visually and export implementation handoff."
};

export default function HomePage() {
  const home = publicContentService.getHome();
  const templates = publicContentService.listTemplates().slice(0, 4);

  return (
    <div className="landing-stack">
      <section className="landing-hero">
        <p className="eyebrow">SYSTEM BUILDER</p>
        <h1>{home.hero.title}</h1>
        <p className="hero-copy">Build reusable system architecture, let the agent propose safe structure edits, and export implementation handoff packages your team can execute.</p>
        <div className="nav-inline">
          <TrackedLink href={home.hero.primaryCta.href} event="homepage_cta_clicked" metadata={{ location: "hero_primary" }}><Button>{home.hero.primaryCta.label}</Button></TrackedLink>
          <TrackedLink href="/templates" event="homepage_cta_clicked" metadata={{ location: "hero_secondary" }}><Button variant="subtle">Browse templates</Button></TrackedLink>
        </div>
      </section>

      <section className="landing-proof-grid">
        <Card>
          <p className="eyebrow">MAIN WEDGE</p>
          <h3>Design systems with an agent</h3>
          <ul>
            <li>Visual graph + validation in one workspace.</li>
            <li>Agent proposes changes with explicit review boundaries.</li>
            <li>Handoff exports for engineering implementation.</li>
          </ul>
        </Card>
        <Card>
          <p className="eyebrow">PRODUCT PROOF</p>
          <div className="proof-panel">
            <div><strong>Design</strong><span>Capture nodes, contracts, and routes.</span></div>
            <div><strong>Review</strong><span>Preview diffs and approve selective edits.</span></div>
            <div><strong>Refine</strong><span>Iterate with validation + simulation feedback.</span></div>
            <div><strong>Handoff</strong><span>Generate build-ready implementation package.</span></div>
          </div>
        </Card>
      </section>

      <section className="landing-sections">
        <Card>
          <h3>Built for repeatable system design</h3>
          <div className="landing-kpi-grid">
            {home.proof.slice(0, 3).map((item) => (
              <div key={item.title}>
                <p className="eyebrow">Capability</p>
                <strong>{item.title}</strong>
                <p className="muted">{item.body}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3>Start from proven blueprints</h3>
          <div className="landing-template-list">
            {templates.map((template) => (
              <TrackedLink key={template.id} href={`/templates/${template.slug}`} event="template_detail_viewed" metadata={{ source: "home" }}>
                <div>
                  <strong>{template.title}</strong>
                  <p className="muted">{template.preview}</p>
                </div>
              </TrackedLink>
            ))}
          </div>
        </Card>
      </section>

      <section className="landing-final-cta">
        <h2>Serious system design, not diagram sprawl.</h2>
        <p className="muted">Create your workspace and start from templates, AI generation, or import.</p>
        <TrackedLink href={home.finalCta.href} event="homepage_cta_clicked" metadata={{ location: "final_cta" }}><Button>{home.finalCta.label}</Button></TrackedLink>
      </section>
    </div>
  );
}
