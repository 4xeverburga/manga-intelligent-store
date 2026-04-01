export function MangaCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="aspect-[3/4] rounded-t-xl bg-muted" />
      <div className="space-y-2 p-3">
        <div className="h-4 w-3/4 rounded bg-muted" />
        <div className="h-3 w-1/2 rounded bg-muted" />
        <div className="flex gap-1">
          <div className="h-5 w-12 rounded-full bg-muted" />
          <div className="h-5 w-12 rounded-full bg-muted" />
        </div>
      </div>
    </div>
  );
}
