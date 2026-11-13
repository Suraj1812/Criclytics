import { Skeleton } from "@/components/ui/skeleton";

export function LoadingCardGrid({ count = 8, page = false }: { count?: number; page?: boolean }) {
  return (
    <div className={page ? "space-y-6" : ""}>
      {page ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_0.6fr]">
          <Skeleton className="h-36 rounded-lg" />
          <Skeleton className="h-36 rounded-lg" />
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3">
        {Array.from({ length: count }).map((_, index) => (
          <div className="rounded-md border border-border bg-card p-4 shadow-soft" key={index}>
            <Skeleton className="h-5 w-28" />
            <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
              <div className="flex flex-col items-center gap-2">
                <Skeleton className="h-14 w-14 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex flex-col items-center gap-2">
                <Skeleton className="h-14 w-14 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
            <div className="mt-6 space-y-3">
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
            </div>
            <Skeleton className="mt-6 h-11 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
