import { publicContentService } from "@/domain/services/public";
import { TemplatesGallery } from "./TemplatesGallery";

export const metadata = {
  title: "Pipes templates",
  description:
    "Production-ready system templates for multi-agent, automation, support, and architecture workflows.",
};

export default function TemplatesPage() {
  const templates = publicContentService.listTemplates();
  return <TemplatesGallery templates={templates} />;
}
