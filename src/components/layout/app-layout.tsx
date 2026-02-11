"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { Sidebar } from "./sidebar";
import { redirect } from "next/navigation";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
