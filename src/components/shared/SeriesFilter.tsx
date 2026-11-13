import { useSearchParams } from "react-router-dom";
import type { SeriesOption } from "@/types/cricket";

export function SeriesFilter({ options }: { options: SeriesOption[] }) {
  const [params, setParams] = useSearchParams();
  return (
    <label className="flex min-w-0 items-center gap-3 text-xs text-muted-foreground">
      <span className="shrink-0">Competition</span>
      <select
        aria-label="Filter by competition"
        className="h-10 min-w-0 max-w-[250px] rounded-md border border-border bg-card px-3 text-xs font-medium text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        value={params.get("series") ?? "__default__"}
        onChange={(event) => {
          const next = new URLSearchParams(params);
          if (event.target.value === "__default__") next.delete("series");
          else next.set("series", event.target.value);
          setParams(next, { replace: true });
        }}
      >
        <option value="__default__">All competitions</option>
        <option value="all">All series</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
