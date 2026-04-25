export function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-100 ${className ?? ""}`} />;
}
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-4 ${i === lines - 1 ? "w-3/4" : "w-full"}`} />
      ))}
    </div>
  );
}
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-100 bg-white p-5 space-y-3 ${className ?? ""}`}>
      <Skeleton className="h-5 w-1/3" />
      <SkeletonText lines={3} />
    </div>
  );
}
