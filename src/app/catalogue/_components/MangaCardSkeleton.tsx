export function MangaCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-[#1e2c31] bg-[#02090a]">
      <div className="aspect-[3/4] rounded-t-xl bg-[#061a1c]" />
      <div className="space-y-2 p-3">
        <div className="h-4 w-3/4 rounded bg-[#061a1c]" />
        <div className="h-3 w-1/2 rounded bg-[#061a1c]" />
        <div className="flex gap-1">
          <div className="h-5 w-12 rounded-full bg-[#061a1c]" />
          <div className="h-5 w-12 rounded-full bg-[#061a1c]" />
        </div>
      </div>
    </div>
  );
}
