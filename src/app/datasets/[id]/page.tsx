"use client";

import { use } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { AppLayout } from "@/components/layout/app-layout";
import { DatasetEditor } from "@/components/datasets/dataset-editor";
import { useDataset } from "@/hooks/use-datasets";
import { Skeleton } from "@/components/ui/skeleton";
import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export default function EditDatasetPage({ params }: Props) {
  const { id } = use(params);
  const { isAuthenticated } = useAuth();
  const { data: dataset, isLoading } = useDataset(id);

  if (!isAuthenticated) {
    redirect("/login");
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <DatasetEditor dataset={dataset} />
      </div>
    </AppLayout>
  );
}
