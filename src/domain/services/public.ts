import { comparisons, homeSections, templateMarketing, useCases } from "@/lib/public/content";
import { isGrowthEvent, recordGrowthEvent } from "@/lib/public/metrics";

export class PublicContentService {
  getHome() { return homeSections; }
  listUseCases() { return useCases; }
  getUseCase(slug: string) { return useCases.find((entry) => entry.slug === slug) ?? null; }
  listComparisons() { return comparisons; }
  getComparison(slug: string) { return comparisons.find((entry) => entry.slug === slug) ?? null; }
  listTemplates() { return templateMarketing; }
  getTemplate(slug: string) { return templateMarketing.find((entry) => entry.slug === slug) ?? null; }
  trackGrowthEvent(event: string, metadata?: Record<string, unknown>) {
    if (!isGrowthEvent(event)) return false;
    recordGrowthEvent(event, metadata);
    return true;
  }
}

export const publicContentService = new PublicContentService();
