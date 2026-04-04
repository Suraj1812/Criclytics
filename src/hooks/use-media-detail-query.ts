import { useQuery } from "@tanstack/react-query";
import { fetchMediaDetail } from "@/services/api-client";

export function useMediaDetailQuery(sourceUrl: string | null) {
  return useQuery({
    queryKey: ["media-detail", sourceUrl],
    queryFn: ({ signal }) => fetchMediaDetail(sourceUrl!, signal),
    enabled: Boolean(sourceUrl),
    staleTime: 5 * 60 * 1_000
  });
}
