import { Badge } from "@/components/ui/badge";
import { getStatusLabel } from "@/lib/formatters";
import type { MatchStatus } from "@/types/cricket";

export function StatusBadge({ status }: { status: MatchStatus }) {
  return (
    <Badge variant={status}>
      {status === "live" ? <span className="h-2 w-2 rounded-full bg-current animate-pulse" /> : null}
      {getStatusLabel(status)}
    </Badge>
  );
}
