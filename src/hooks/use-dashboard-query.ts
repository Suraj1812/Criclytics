import { useQuery } from "@tanstack/react-query";
import { fetchDashboardFeed } from "@/services/api-client";
import { useRuntimeState } from "@/hooks/use-runtime-state";

const DASHBOARD_POLL_INTERVAL_MS = Number(import.meta.env.VITE_MATCH_FEED_POLL_MS || 5_000);

export function useDashboardQuery(series: string | null, status?: "live" | "upcoming" | "completed") {
  const { isOnline, isVisible } = useRuntimeState();

  return useQuery({
    queryKey: ["dashboard", series ?? "__default__", status ?? "__all__"],
    queryFn: ({ signal }) => fetchDashboardFeed({ series, status, signal }),
    placeholderData: (previousData) => previousData,
    staleTime: status === "live" || !status ? 5_000 : 20_000,
    refetchOnReconnect: true,
    refetchInterval(query) {
      if (!isOnline || !isVisible) {
        return false;
      }

      const data = query.state.data;
      const hasLiveMatches = status === "live" || Boolean(data?.live.length);
      return hasLiveMatches ? DASHBOARD_POLL_INTERVAL_MS : 15_000;
    }
  });
}
