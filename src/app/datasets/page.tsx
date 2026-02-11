"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { AppLayout } from "@/components/layout/app-layout";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { DatasetList } from "@/components/datasets/dataset-list";
import { useDatasets } from "@/hooks/use-datasets";
import { Plus } from "lucide-react";
import { redirect } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function DatasetsPage() {
  const { isAuthenticated } = useAuth();
  const {
    datasets,
    isLoading,
    delete: deleteDataset,
    isDeleting,
    getUri,
  } = useDatasets();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  if (!isAuthenticated) {
    redirect("/login");
  }

  const handleDelete = async () => {
    if (deleteId) {
      await deleteDataset(deleteId);
      setDeleteId(null);
    }
  };

  const handleCopyUri = (id: string) => {
    const uri = getUri?.(id);
    if (uri) {
      navigator.clipboard.writeText(uri);
      toast.success("URI copied to clipboard");
    }
  };

  return (
    <AppLayout>
      <Header title="Datasets">
        <Button asChild>
          <Link href="/datasets/new">
            <Plus className="h-4 w-4 mr-2" />
            Create Dataset
          </Link>
        </Button>
      </Header>
      <div className="p-6">
        <DatasetList
          datasets={datasets}
          isLoading={isLoading}
          onDelete={(id) => setDeleteId(id)}
          onCopyUri={handleCopyUri}
        />
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Dataset?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Service configs using this dataset
              will need to be updated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
