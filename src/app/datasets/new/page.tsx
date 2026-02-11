"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { AppLayout } from "@/components/layout/app-layout";
import { DatasetEditor } from "@/components/datasets/dataset-editor";
import { redirect } from "next/navigation";

export default function NewDatasetPage() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    redirect("/login");
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <DatasetEditor isNew />
      </div>
    </AppLayout>
  );
}
