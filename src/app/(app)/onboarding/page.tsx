import { publicContentService } from "@/domain/services/public";
import { OnboardingClient } from "@/components/onboarding/OnboardingClient";

export default function OnboardingPage() {
  const templates = publicContentService.listTemplates().slice(0, 3);
  return <OnboardingClient initialTemplates={templates} />;
}
