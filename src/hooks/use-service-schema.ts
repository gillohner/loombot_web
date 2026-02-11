import { useQuery } from "@tanstack/react-query";
import { loadServiceFromGit } from "@/lib/services/service-loader";
import type { LoadedService } from "@/types/service-config";

export function useServiceSchema(gitUrl: string | undefined) {
  return useQuery({
    queryKey: ["service-schema", gitUrl],
    queryFn: async (): Promise<LoadedService> => {
      if (!gitUrl) throw new Error("No git URL provided");
      return loadServiceFromGit(gitUrl);
    },
    enabled: !!gitUrl && gitUrl.length > 0,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    retry: 1,
  });
}
