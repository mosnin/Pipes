import { publicContentService } from "@/domain/services/public";
import { TemplatesGallery } from "./TemplatesGallery";

export const metadata = {
  title: "Templates - Pipes",
  description:
    "Forkable systems your team has already shipped. Multi-agent, support, engineering, and ops, ready to fork.",
};

export default function TemplatesPage() {
  const templates = publicContentService.listTemplates();
  return <TemplatesGallery templates={templates} />;
}
