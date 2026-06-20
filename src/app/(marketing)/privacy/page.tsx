import { LegalDocument, type LegalSection } from "@/components/marketing/LegalDocument";

export const metadata = {
  title: "Privacy Policy - Looper",
  description:
    "What data Looper collects, why, and the control you have over it.",
};

const SECTIONS: ReadonlyArray<LegalSection> = [
  {
    id: "what-we-collect",
    heading: "1. What we collect",
    body: (
      <>
        <p>We collect only what we need to run the Service:</p>
        <ul className="list-disc pl-5 flex flex-col gap-1.5">
          <li>
            <strong>Account data</strong> — your email, name, and workspace
            membership, provided through our authentication provider.
          </li>
          <li>
            <strong>Content</strong> — the loops, nodes, pipes, comments, and
            schemas you create.
          </li>
          <li>
            <strong>Usage data</strong> — product events such as which features
            you use, to improve the Service.
          </li>
          <li>
            <strong>Billing data</strong> — handled by our payment processor; we
            never store full card numbers.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "how-we-use",
    heading: "2. How we use it",
    body: (
      <>
        <p>We use your data to:</p>
        <ul className="list-disc pl-5 flex flex-col gap-1.5">
          <li>Operate, maintain, and secure the Service.</li>
          <li>Provide AI generation when you ask for it.</li>
          <li>Communicate about your account and service changes.</li>
          <li>Understand product usage in aggregate.</li>
        </ul>
        <p>
          We do not sell your personal data. We do not use the content of your
          loops to train shared models.
        </p>
      </>
    ),
  },
  {
    id: "ai-processing",
    heading: "3. AI processing",
    body: (
      <p>
        When you use AI generation, the prompt and relevant graph context are
        sent to our model provider to produce a response. We send only what the
        request needs. Providers process this data under their own terms and do
        not use it to train models on your behalf without explicit configuration.
      </p>
    ),
  },
  {
    id: "sharing",
    heading: "4. When we share data",
    body: (
      <>
        <p>We share data only with:</p>
        <ul className="list-disc pl-5 flex flex-col gap-1.5">
          <li>Service providers who process data on our behalf (hosting, auth, payments, email, AI).</li>
          <li>Members of your own workspace, per the access controls you set.</li>
          <li>Authorities, where required by law.</li>
        </ul>
      </>
    ),
  },
  {
    id: "retention",
    heading: "5. Data retention",
    body: (
      <p>
        We keep your content while your workspace is active. When you delete
        content or close a workspace, we remove it from active systems within a
        reasonable period, subject to backups and legal obligations.
      </p>
    ),
  },
  {
    id: "your-rights",
    heading: "6. Your rights",
    body: (
      <p>
        Depending on your jurisdiction, you may have the right to access,
        correct, export, or delete your personal data. Reach us through the{" "}
        <a href="/contact" className="text-indigo-600 hover:text-indigo-800 font-medium">
          contact page
        </a>{" "}
        and we will respond within the time the law requires.
      </p>
    ),
  },
  {
    id: "security",
    heading: "7. Security",
    body: (
      <p>
        We protect your data with encryption in transit, workspace-level tenant
        isolation, and least-privilege access. Read more on the{" "}
        <a href="/security" className="text-indigo-600 hover:text-indigo-800 font-medium">
          security page
        </a>
        . No system is perfectly secure, but security is part of the product,
        not an afterthought.
      </p>
    ),
  },
  {
    id: "changes",
    heading: "8. Changes",
    body: (
      <p>
        We may update this policy as the Service evolves. Material changes will
        be announced in the product or by email.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      lastUpdated="June 2026"
      intro={
        <p>
          Your loops are yours. This policy explains what we collect, why, and
          the control you have over it. We collect the minimum we need and we do
          not sell your data.
        </p>
      }
      sections={SECTIONS}
    />
  );
}
