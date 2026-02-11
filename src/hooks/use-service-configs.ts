import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/providers/auth-provider";
import { BotBuilderStorage } from "@/lib/storage/bot-builder-storage";
import type { ServiceConfig, ServiceConfigFormData, LoadedService } from "@/types/service-config";
import { toast } from "sonner";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useServiceConfigs() {
  const { auth } = useAuth();
  const queryClient = useQueryClient();

  const storage =
    auth.session && auth.publicKey && auth.publicKey.trim().length > 0
      ? new BotBuilderStorage(auth.session, auth.publicKey)
      : null;

  const listQuery = useQuery({
    queryKey: ["service-configs", auth.publicKey],
    queryFn: async () => {
      if (!storage) throw new Error("Not authenticated");
      return storage.listServiceConfigs();
    },
    enabled: !!storage,
  });

  const createMutation = useMutation({
    mutationFn: async ({
      data,
      loadedService,
    }: {
      data: ServiceConfigFormData;
      loadedService: LoadedService;
    }) => {
      if (!storage || !auth.publicKey) throw new Error("Not authenticated");
      const now = new Date().toISOString();
      const config: ServiceConfig = {
        id: generateId(),
        source: data.source,
        sourceVersion: data.sourceVersion,
        command: data.command,
        kind: loadedService.manifest.kind,
        name: data.name,
        description: data.description,
        tags: data.tags,
        author: auth.publicKey,
        manifest: loadedService.manifest,
        config: data.config,
        datasets: data.datasets,
        createdAt: now,
        updatedAt: now,
      };
      await storage.saveServiceConfig(config);
      return config;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-configs"] });
      toast.success("Service config created");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to create service config");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<ServiceConfigFormData>;
    }) => {
      if (!storage) throw new Error("Not authenticated");
      const existing = await storage.getServiceConfig(id);
      if (!existing) throw new Error("Service config not found");

      const updated: ServiceConfig = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      };
      await storage.saveServiceConfig(updated);
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-configs"] });
      toast.success("Service config updated");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update service config");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!storage) throw new Error("Not authenticated");
      await storage.deleteServiceConfig(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-configs"] });
      toast.success("Service config deleted");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to delete service config");
    },
  });

  return {
    configs: listQuery.data ?? [],
    isLoading: listQuery.isLoading,
    error: listQuery.error,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    getUri: (id: string) => storage?.buildServiceConfigUri(id),
  };
}

export function useServiceConfig(id: string | undefined) {
  const { auth } = useAuth();

  const storage =
    auth.session && auth.publicKey && auth.publicKey.trim().length > 0
      ? new BotBuilderStorage(auth.session, auth.publicKey)
      : null;

  return useQuery({
    queryKey: ["service-config", id],
    queryFn: async () => {
      if (!storage || !id) throw new Error("Not authenticated or no ID");
      return storage.getServiceConfig(id);
    },
    enabled: !!storage && !!id,
  });
}
