"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { AppLayout } from "@/components/layout/app-layout";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ServiceConfigList } from "@/components/service-configs/service-config-list";
import { useServiceConfigs } from "@/hooks/use-service-configs";
import { useServiceConfigSearch } from "@/hooks/use-search";
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
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function ServiceConfigsPage() {
  const { isAuthenticated } = useAuth();
  const {
    configs,
    isLoading,
    delete: deleteConfig,
    isDeleting,
    getUri,
  } = useServiceConfigs();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [tab, setTab] = useState<"my" | "discover">("my");

  const { data: searchResults, isLoading: isSearching } =
    useServiceConfigSearch({
      query: searchQuery,
      limit: 50,
    });

  if (!isAuthenticated) {
    redirect("/login");
  }

  const handleDelete = async () => {
    if (deleteId) {
      await deleteConfig(deleteId);
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
      <Header title="Service Configs">
        <Button asChild>
          <Link href="/service-configs/new">
            <Plus className="h-4 w-4 mr-2" />
            Create Config
          </Link>
        </Button>
      </Header>
      <div className="p-6 space-y-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "my" | "discover")}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="my">My Configs</TabsTrigger>
              <TabsTrigger value="discover">Discover</TabsTrigger>
            </TabsList>

            {tab === "discover" && (
              <Input
                placeholder="Search service configs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-xs"
              />
            )}
          </div>

          <TabsContent value="my" className="mt-4">
            <ServiceConfigList
              configs={configs}
              isLoading={isLoading}
              onDelete={(id) => setDeleteId(id)}
              onCopyUri={handleCopyUri}
            />
          </TabsContent>

          <TabsContent value="discover" className="mt-4">
            {/* Show discovered configs from the network */}
            {isSearching ? (
              <ServiceConfigList configs={[]} isLoading />
            ) : searchResults && searchResults.entities.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {searchResults.entities.map((entity) => (
                  <div
                    key={entity.uri}
                    className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                  >
                    <h3 className="font-semibold">{entity.name}</h3>
                    {entity.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {entity.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs bg-muted px-2 py-1 rounded">
                        {entity.kind}
                      </span>
                      {entity.tags.slice(0, 2).map((tag, index) => (
                        <span
                          key={`${tag}-${index}`}
                          className="text-xs bg-muted px-2 py-1 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 font-mono truncate">
                      {entity.owner.slice(0, 16)}...
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                {searchQuery
                  ? "No matching configs found"
                  : "No service configs discovered yet. Create and save a service config to make it discoverable."}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service Config?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Bot configs using this service will
              need to be updated.
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
