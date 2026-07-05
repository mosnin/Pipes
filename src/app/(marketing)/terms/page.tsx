import { LegalDocument, type LegalSection } from "@/components/marketing/LegalDocument";

export const metadata = {
  title: "Terms of Service - Pipes",
  description:
    "The terms that govern your use of Pipes. Plain language where we can manage it.",
};

const SECTIONS: ReadonlyArray<LegalSection> = [
  {
    id: "acceptance",
    heading: "1. Acceptance of terms",
    body: (
      <>
        <p>
          By creating a workspace or using Pipes (the &quot;Service&quot;), you agree
          to these Terms of Service. If you are using Pipes on behalf of an
          organization, you represent that you have authority to bind that
          organization to these terms.
        </p>
        <p>
          If you do not agree to these terms, do not use the Service.
        </p>
      </>
    ),
  },
  {
    id: "accounts",
    heading: "2. Accounts and workspaces",
    body: (
      <>
        <p>
          A workspace is the boundary for your data, billing, and access
          control. You are responsible for activity under your account and for
          keeping your credentials and API tokens secure.
        </p>
        <p>
          Tokens are shown once at creation and stored only as a hash. Treat
          them like keys. You are responsible for revoking any token that is
          lost or compromised.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    heading: "3. Acceptable use",
    body: (
      <>
        <p>You agree not to use Pipes to:</p>
        <ul className="list-disc pl-5 flex flex-col gap-1.5">
          <li>Violate any law or the rights of others.</li>
          <li>Build systems that send unsolicited bulk messages or malware.</li>
          <li>Probe, scan, or attempt to breach the Service or its tenants.</li>
          <li>Resell the Service without a written agreement.</li>
        </ul>
        <p>
          We may suspend access for conduct that threatens the Service or other
          customers, with notice where practical.
        </p>
      </>
    ),
  },
  {
    id: "content",
    heading: "4. Your content",
    body: (
      <>
        <p>
          You own the loops, schemas, and other content you create. You grant us
          a limited license to host, process, and display that content solely to
          operate the Service for you.
        </p>
        <p>
          If you publish a loop to the marketplace, you grant other workspaces a
          license to install and use it under the terms you set on the listing.
        </p>
      </>
    ),
  },
  {
    id: "billing",
    heading: "5. Plans and billing",
    body: (
      <>
        <p>
          Paid plans are billed in advance on a recurring basis. You can change
          or cancel a plan at any time; cancellation takes effect at the end of
          the current billing period. Fees already paid are non-refundable
          except where required by law.
        </p>
        <p>
          Usage limits and entitlements for each plan are described on the
          pricing page and may change with notice.
        </p>
      </>
    ),
  },
  {
    id: "warranty",
    heading: "6. Disclaimer of warranties",
    body: (
      <p>
        The Service is provided &quot;as is&quot; without warranties of any kind,
        whether express or implied, including fitness for a particular purpose.
        AI-generated output may be inaccurate; you are responsible for reviewing
        any loop before you rely on it.
      </p>
    ),
  },
  {
    id: "liability",
    heading: "7. Limitation of liability",
    body: (
      <p>
        To the maximum extent permitted by law, Pipes is not liable for
        indirect, incidental, or consequential damages. Our total liability for
        any claim is limited to the amount you paid us in the twelve months
        before the claim.
      </p>
    ),
  },
  {
    id: "changes",
    heading: "8. Changes to these terms",
    body: (
      <p>
        We may update these terms from time to time. Material changes will be
        announced in the product or by email. Continued use after a change means
        you accept the revised terms.
      </p>
    ),
  },
  {
    id: "contact",
    heading: "9. Contact",
    body: (
      <p>
        Questions about these terms? Reach us through the{" "}
        <a href="/contact" className="text-violet-600 hover:text-violet-800 font-medium">
          contact page
        </a>
        .
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms of Service"
      lastUpdated="June 2026"
      intro={
        <p>
          These terms govern your use of Pipes. We have kept them as short and
          plain as we responsibly can. Read them; they are the agreement between
          us.
        </p>
      }
      sections={SECTIONS}
    />
  );
}
