import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/providers/auth-provider";
import { BotBuilderStorage } from "@/lib/storage/bot-builder-storage";
import type { BotConfig, BotConfigFormData } from "@/types/bot-config";
import { toast } from "sonner";

function notifyIndexer(publicKey: string) {
  fetch("/api/indexer/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ publicKey }),
  }).catch(() => {});
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useBotConfigs() {
  const { auth } = useAuth();
  const queryClient = useQueryClient();

  const storage =
    auth.session && auth.publicKey && auth.publicKey.trim().length > 0
      ? new BotBuilderStorage(auth.session, auth.publicKey)
      : null;

  const listQuery = useQuery({
    queryKey: ["bot-configs", auth.publicKey],
    queryFn: async () => {
      if (!storage) throw new Error("Not authenticated");
      return storage.listConfigs();
    },
    enabled: !!storage,
  });

  const createMutation = useMutation({
    mutationFn: async (data: BotConfigFormData) => {
      if (!storage) throw new Error("Not authenticated");
      const now = new Date().toISOString();
      const config: BotConfig = {
        configId: generateId(),
        name: data.name,
        description: data.description,
        version: "1.0.0",
        createdAt: now,
        updatedAt: now,
        services: data.services,
        listeners: data.listeners,
      };
      await storage.saveConfig(config);
      return config;
    },
    onSuccess: (config) => {
      queryClient.invalidateQueries({ queryKey: ["bot-configs"] });
      queryClient.removeQueries({ queryKey: ["bot-config", config.configId] });
      if (auth.publicKey) notifyIndexer(auth.publicKey);
      toast.success("Bot config created");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to create config");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BotConfigFormData> }) => {
      if (!storage) throw new Error("Not authenticated");
      const existing = await storage.getConfig(id);
      if (!existing) throw new Error("Config not found");

      const updated: BotConfig = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      };
      await storage.saveConfig(updated);
      return updated;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bot-configs"] });
      queryClient.removeQueries({ queryKey: ["bot-config", variables.id] });
      if (auth.publicKey) notifyIndexer(auth.publicKey);
      toast.success("Bot config updated");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update config");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!storage) throw new Error("Not authenticated");
      await storage.deleteConfig(id);
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["bot-configs"] });
      queryClient.removeQueries({ queryKey: ["bot-config", id] });
      if (auth.publicKey) notifyIndexer(auth.publicKey);
      toast.success("Bot config deleted");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to delete config");
    },
  });

  const getUri = (id: string): string | null => {
    if (!storage) return null;
    return storage.buildConfigUri(id);
  };

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
    getUri,
  };
}

export function useBotConfig(id: string | undefined) {
  const { auth } = useAuth();

  const storage =
    auth.session && auth.publicKey && auth.publicKey.trim().length > 0
      ? new BotBuilderStorage(auth.session, auth.publicKey)
      : null;

  return useQuery({
    queryKey: ["bot-config", id],
    queryFn: async () => {
      if (!storage || !id) throw new Error("Not authenticated or no ID");
      return storage.getConfig(id);
    },
    enabled: !!storage && !!id,
  });
}
