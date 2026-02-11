"use client";

import { use } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { AppLayout } from "@/components/layout/app-layout";
import { ServiceConfigEditor } from "@/components/service-configs/service-config-editor";
import { useServiceConfig } from "@/hooks/use-service-configs";
import { Skeleton } from "@/components/ui/skeleton";
import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export default function EditServiceConfigPage({ params }: Props) {
  const { id } = use(params);
  const { isAuthenticated } = useAuth();
  const { data: config, isLoading } = useServiceConfig(id);

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
        <ServiceConfigEditor config={config} />
      </div>
    </AppLayout>
  );
}
