import Link from "next/link";
import { Card, Chip } from "@heroui/react";

interface FeatureCardProps {
  icon: string;
  title: string;
  description?: string;
  href?: string;
  isNew?: boolean;
}

export function FeatureCard({
  icon,
  title,
  description,
  href,
  isNew = false,
}: FeatureCardProps) {
  const card = (
    <Card
      className={[
        "relative bg-white border border-slate-200 rounded-xl shadow-none",
        href ? "cursor-pointer hover:shadow-md transition-shadow" : "",
      ].join(" ")}
    >
      <Card.Content className="flex flex-col gap-2 p-4">
        {isNew && (
          <div className="absolute top-3 right-3">
            <Chip color="success" size="sm" variant="soft">
              New
            </Chip>
          </div>
        )}

        <div className="flex items-center justify-center w-10 h-10 text-3xl leading-none select-none">
          {icon}
        </div>

        <p className="font-semibold text-sm text-slate-900 leading-snug">
          {title}
        </p>

        {description && (
          <p className="text-xs text-slate-500 leading-relaxed">
            {description}
          </p>
        )}
      </Card.Content>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block outline-none">
        {card}
      </Link>
    );
  }

  return card;
}
