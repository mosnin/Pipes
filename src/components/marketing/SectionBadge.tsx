interface SectionBadgeProps {
  icon?: React.ReactNode;
  label: string;
}

export function SectionBadge({ icon, label }: SectionBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1.5 text-indigo-600 text-sm font-medium">
      {icon}
      {label}
    </span>
  );
}
