"use client";

import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import { AppLayout } from "@/components/layout/app-layout";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { BotConfigList } from "@/components/configs/bot-config-list";
import { useBotConfigs } from "@/hooks/use-bot-configs";
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
import { useState } from "react";

export default function ConfigsPage() {
  const { isAuthenticated } = useAuth();
  const { configs, isLoading, delete: deleteConfig, isDeleting } = useBotConfigs();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  if (!isAuthenticated) {
    redirect("/login");
  }

  const handleDelete = async () => {
    if (deleteId) {
      await deleteConfig(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <AppLayout>
      <Header title="Bot Configs">
        <Button asChild>
          <Link href="/configs/new">
            <Plus className="h-4 w-4 mr-2" />
            Create Config
          </Link>
        </Button>
      </Header>
      <div className="p-6">
        <BotConfigList
          configs={configs}
          isLoading={isLoading}
          onDelete={(id) => setDeleteId(id)}
        />
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bot Config?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the bot
              configuration.
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
