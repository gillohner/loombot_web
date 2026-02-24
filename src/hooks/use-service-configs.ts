import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/providers/auth-provider";
import { BotBuilderStorage } from "@/lib/storage/bot-builder-storage";
import type { ServiceConfig, ServiceConfigFormData, LoadedService } from "@/types/service-config";
import { gitUrlToStructuredSource } from "@/lib/services/service-loader";
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

      // Convert Git URL to structured source format for bot builder
      const structuredSource = gitUrlToStructuredSource(data.source);

      // Use command from form data, or fall back to manifest command
      // Command is required for single_command and command_flow, but not for listeners
      const command = data.command || loadedService.manifest.command;
      if (!command && loadedService.manifest.kind !== "listener") {
        throw new Error("Command is required for this service type");
      }

      const config: ServiceConfig = {
        configId: generateId(),
        source: structuredSource,
        command,
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
    onSuccess: (config) => {
      queryClient.invalidateQueries({ queryKey: ["service-configs"] });
      queryClient.removeQueries({ queryKey: ["service-config", config.configId] });
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

      // Build updates, converting source if provided
      const { source, ...restData } = data;
      const updates: Partial<ServiceConfig> = {
        ...restData,
      };

      if (source) {
        updates.source = gitUrlToStructuredSource(source);
      }

      const updated: ServiceConfig = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      await storage.saveServiceConfig(updated);
      return updated;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["service-configs"] });
      // Remove cached individual query so the edit page does a fresh fetch
      // (invalidate alone serves stale cache first, which initializes useState with old data)
      queryClient.removeQueries({ queryKey: ["service-config", variables.id] });
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
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["service-configs"] });
      queryClient.removeQueries({ queryKey: ["service-config", id] });
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
