import { cn } from "@/lib/utils";

export function CriclyticsLogo({ className }: { className?: string }) {
  return <img alt="Criclytics logo" className={cn("h-11 w-11", className)} src="/favicon.svg" />;
}
