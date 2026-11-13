import { cn } from "@/lib/utils";

export function CriclyticsLogo({ className }: { className?: string }) {
  return (
    <img
      alt="Cric Lytics — cricket bat and ball"
      className={cn("h-12 w-12 shrink-0 object-contain dark:brightness-0 dark:invert sm:h-14 sm:w-14", className)}
      src="/brand/cric-lytics-mark.png"
      width={560}
      height={580}
      fetchPriority="high"
    />
  );
}
