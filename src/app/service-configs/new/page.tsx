"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { AppLayout } from "@/components/layout/app-layout";
import { ServiceConfigEditor } from "@/components/service-configs/service-config-editor";
import { redirect } from "next/navigation";

export default function NewServiceConfigPage() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    redirect("/login");
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <ServiceConfigEditor isNew />
      </div>
    </AppLayout>
  );
}
