import { useQuery } from "@tanstack/react-query";
import type { SearchQuery, SearchResult } from "@/types/indexer";

async function searchEntities(query: SearchQuery): Promise<SearchResult> {
  const response = await fetch("/api/indexer/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(query),
  });

  if (!response.ok) {
    throw new Error("Search failed");
  }

  return response.json();
}

export function useSearch(query: SearchQuery, enabled = true) {
  return useQuery({
    queryKey: ["search", query],
    queryFn: () => searchEntities(query),
    enabled: enabled && (!!query.query || !!query.type || !!query.tags?.length),
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useServiceConfigSearch(options: {
  query?: string;
  kind?: string;
  tags?: string[];
  limit?: number;
}) {
  return useSearch(
    {
      ...options,
      type: "service_config",
    },
    true
  );
}

export function useDatasetSearch(options: {
  query?: string;
  tags?: string[];
  limit?: number;
}) {
  return useSearch(
    {
      ...options,
      type: "dataset",
    },
    true
  );
}
