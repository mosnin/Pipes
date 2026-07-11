export function Skeleton({ className }: { className?: string }) {
  return <div className={`looper-skeleton rounded-lg ${className ?? ""}`} />;
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2.5 ${className ?? ""}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3.5 ${i === lines - 1 ? "w-3/4" : "w-full"}`} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={`rounded-2xl border border-black/[0.06] bg-white p-5 space-y-4 ${className ?? ""}`}>
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-xl shrink-0" />
        <Skeleton className="h-4 w-2/5" />
      </div>
      <SkeletonText lines={2} />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonSettingsSection({ className }: { className?: string }) {
  return (
    <div className={`space-y-6 ${className ?? ""}`}>
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-3.5 w-3/5" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
      <Skeleton className="h-9 w-24 rounded-full" />
    </div>
  );
}
