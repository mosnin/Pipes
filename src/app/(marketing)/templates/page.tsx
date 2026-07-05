import { publicContentService } from "@/domain/services/public";
import { TemplatesGallery } from "./TemplatesGallery";

export const metadata = {
  title: "Starters - Pipes",
  description:
    "Start with a sentence. Each starter opens a prompt that builds the system on the canvas in seconds.",
};

export default function TemplatesPage() {
  const templates = publicContentService.listTemplates();
  return <TemplatesGallery templates={templates} />;
}
