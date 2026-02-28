import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/providers/auth-provider";
import { BotBuilderStorage } from "@/lib/storage/bot-builder-storage";
import type { Dataset, DatasetFormData } from "@/types/dataset";
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

export function useDatasets() {
  const { auth } = useAuth();
  const queryClient = useQueryClient();

  const storage =
    auth.session && auth.publicKey && auth.publicKey.trim().length > 0
      ? new BotBuilderStorage(auth.session, auth.publicKey)
      : null;

  const listQuery = useQuery({
    queryKey: ["datasets", auth.publicKey],
    queryFn: async () => {
      if (!storage) throw new Error("Not authenticated");
      return storage.listDatasets();
    },
    enabled: !!storage,
  });

  const createMutation = useMutation({
    mutationFn: async (data: DatasetFormData) => {
      if (!storage || !auth.publicKey) throw new Error("Not authenticated");
      const now = new Date().toISOString();
      const dataset: Dataset = {
        id: generateId(),
        name: data.name,
        description: data.description,
        tags: data.tags,
        author: auth.publicKey,
        schemaSource: data.schemaSource,
        schemaDatasetName: data.schemaDatasetName,
        data: data.data,
        createdAt: now,
        updatedAt: now,
      };
      await storage.saveDataset(dataset);
      return dataset;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["datasets"] });
      if (auth.publicKey) notifyIndexer(auth.publicKey);
      toast.success("Dataset created");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to create dataset");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<DatasetFormData>;
    }) => {
      if (!storage) throw new Error("Not authenticated");
      const existing = await storage.getDataset(id);
      if (!existing) throw new Error("Dataset not found");

      const updated: Dataset = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      };
      await storage.saveDataset(updated);
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["datasets"] });
      if (auth.publicKey) notifyIndexer(auth.publicKey);
      toast.success("Dataset updated");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update dataset");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!storage) throw new Error("Not authenticated");
      await storage.deleteDataset(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["datasets"] });
      if (auth.publicKey) notifyIndexer(auth.publicKey);
      toast.success("Dataset deleted");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to delete dataset");
    },
  });

  return {
    datasets: listQuery.data ?? [],
    isLoading: listQuery.isLoading,
    error: listQuery.error,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    getUri: (id: string) => storage?.buildDatasetUri(id),
  };
}

export function useDataset(id: string | undefined) {
  const { auth } = useAuth();

  const storage =
    auth.session && auth.publicKey && auth.publicKey.trim().length > 0
      ? new BotBuilderStorage(auth.session, auth.publicKey)
      : null;

  return useQuery({
    queryKey: ["dataset", id],
    queryFn: async () => {
      if (!storage || !id) throw new Error("Not authenticated or no ID");
      return storage.getDataset(id);
    },
    enabled: !!storage && !!id,
  });
}
