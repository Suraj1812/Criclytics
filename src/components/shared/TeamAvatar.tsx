import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { TeamSummary } from "@/types/cricket";

const sizeMap = {
  sm: "h-10 w-10",
  md: "h-14 w-14",
  lg: "h-16 w-16"
} as const;

export function TeamAvatar({ team, size = "md" }: { team: TeamSummary; size?: keyof typeof sizeMap }) {
  return (
    <Avatar className={cn(sizeMap[size], "border border-border bg-background shadow-sm")}>
      <AvatarImage alt={team.name} src={team.logoUrl || undefined} />
      <AvatarFallback>{team.shortName.slice(0, 3)}</AvatarFallback>
    </Avatar>
  );
}
