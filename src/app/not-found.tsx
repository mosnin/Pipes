import Link from "next/link";
import { Button, Card, PageHeader } from "@/components/ui";

export default function NotFound() {
  return (
    <div>
      <PageHeader title="Page not found" subtitle="The requested route does not exist or is no longer available." />
      <Card>
        <p>Check the URL or return to the system library.</p>
        <Link href="/dashboard"><Button>Return to Systems</Button></Link>
      </Card>
    </div>
  );
}
