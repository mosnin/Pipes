import { LegalDocument, type LegalSection } from "@/components/marketing/LegalDocument";

export const metadata = {
  title: "Data Processing Agreement - Pipes",
  description:
    "How Pipes processes personal data on behalf of customers under applicable data protection law.",
};

const SECTIONS: ReadonlyArray<LegalSection> = [
  {
    id: "roles",
    heading: "1. Roles of the parties",
    body: (
      <p>
        For personal data contained in your content, you are the data
        controller and Pipes is the data processor. We process that data only
        on your documented instructions, which include your use of the Service
        and these terms.
      </p>
    ),
  },
  {
    id: "scope",
    heading: "2. Scope of processing",
    body: (
      <>
        <p>
          We process personal data only to provide and support the Service. The
          subject matter is the operation of your workspace; the duration is the
          term of your account; the nature is hosting, computation, and AI
          generation as you direct.
        </p>
        <p>
          Categories of data subjects and personal data are determined by you
          through the content you create.
        </p>
      </>
    ),
  },
  {
    id: "subprocessors",
    heading: "3. Subprocessors",
    body: (
      <>
        <p>
          We use a small set of subprocessors to operate the Service, including
          providers for hosting, authentication, payments, email, and AI model
          inference. Each is bound by data protection obligations no less
          protective than those in this agreement.
        </p>
        <p>
          We will give notice of new subprocessors and a reasonable opportunity
          to object before they begin processing your data.
        </p>
      </>
    ),
  },
  {
    id: "security",
    heading: "4. Security measures",
    body: (
      <p>
        We maintain technical and organizational measures appropriate to the
        risk, including encryption in transit, workspace-level tenant
        isolation, least-privilege access, and audit logging. Details are on the{" "}
        <a href="/security" className="text-violet-600 hover:text-violet-800 font-medium">
          security page
        </a>
        .
      </p>
    ),
  },
  {
    id: "international",
    heading: "5. International transfers",
    body: (
      <p>
        Where personal data is transferred across borders, we rely on lawful
        transfer mechanisms such as Standard Contractual Clauses, and we require
        the same of our subprocessors.
      </p>
    ),
  },
  {
    id: "breach",
    heading: "6. Personal data breach",
    body: (
      <p>
        We will notify you without undue delay after becoming aware of a
        personal data breach affecting your data, with the information you need
        to meet your own notification obligations.
      </p>
    ),
  },
  {
    id: "assistance",
    heading: "7. Assistance and audits",
    body: (
      <p>
        We will assist you, taking into account the nature of processing, with
        data subject requests and with your obligations around security, breach
        notification, and impact assessments. We make available the information
        needed to demonstrate compliance.
      </p>
    ),
  },
  {
    id: "deletion",
    heading: "8. Return and deletion",
    body: (
      <p>
        On termination, we delete or return personal data as you choose, subject
        to retention required by law and routine backup cycles.
      </p>
    ),
  },
  {
    id: "contact",
    heading: "9. How to sign",
    body: (
      <p>
        Need a countersigned DPA for your records? Reach us through the{" "}
        <a href="/contact?source=dpa" className="text-violet-600 hover:text-violet-800 font-medium">
          contact page
        </a>{" "}
        and we will send one over.
      </p>
    ),
  },
];

export default function DpaPage() {
  return (
    <LegalDocument
      title="Data Processing Agreement"
      lastUpdated="June 2026"
      intro={
        <p>
          This Data Processing Agreement describes how Pipes processes personal
          data on your behalf when you use the Service. It supplements our Terms
          of Service and applies where data protection law requires it.
        </p>
      }
      sections={SECTIONS}
    />
  );
}
