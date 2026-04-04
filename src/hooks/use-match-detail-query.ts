import { useQuery } from "@tanstack/react-query";
import { fetchMatchDetail } from "@/services/api-client";
import { useRuntimeState } from "@/hooks/use-runtime-state";

const LIVE_MATCH_POLL_INTERVAL_MS = Number(import.meta.env.VITE_MATCH_FEED_POLL_MS || 5_000);

export function useMatchDetailQuery(matchId: string | undefined) {
  const { isOnline, isVisible } = useRuntimeState();

  return useQuery({
    queryKey: ["match-detail", matchId],
    queryFn: ({ signal }) => fetchMatchDetail(matchId!, signal),
    enabled: Boolean(matchId),
    placeholderData: (previousData) => previousData,
    staleTime: 5_000,
    refetchOnReconnect: true,
    refetchInterval: (query) => (isOnline && isVisible && query.state.data?.status === "live" ? LIVE_MATCH_POLL_INTERVAL_MS : false)
  });
}
