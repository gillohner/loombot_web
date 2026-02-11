"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Settings,
  Plus,
  Radio,
  Command,
  Workflow,
} from "lucide-react";
import { useServiceConfigs } from "@/hooks/use-service-configs";
import { useServiceConfigSearch } from "@/hooks/use-search";
import Link from "next/link";

interface ServiceConfigSearchProps {
  kind?: string;
  onSelect: (uri: string, name: string) => void;
  onClose: () => void;
}

export function ServiceConfigSearch({
  kind,
  onSelect,
  onClose,
}: ServiceConfigSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [tab, setTab] = useState<"my" | "discover">("my");

  const { configs: myConfigs, isLoading: isLoadingMy, getUri } = useServiceConfigs();
  const {
    data: searchResults,
    isLoading: isLoadingSearch,
  } = useServiceConfigSearch({
    query: searchQuery,
    kind,
    limit: 20,
  });

  const filteredMyConfigs = myConfigs.filter((config) => {
    // Filter by kind
    if (kind) {
      if (kind === "command") {
        // For commands, allow single_command and command_flow
        if (config.manifest.kind !== "single_command" && config.manifest.kind !== "command_flow") {
          return false;
        }
      } else if (config.manifest.kind !== kind) {
        return false;
      }
    }

    // Filter by search query
    if (
      searchQuery &&
      !config.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const handleSelect = (id: string, name: string, isOwn: boolean) => {
    if (isOwn && getUri) {
      const uri = getUri(id);
      if (uri) {
        onSelect(uri, name);
      }
    } else {
      // For discovered configs, the URI is in the indexed entity
      const entity = searchResults?.entities.find((e) => e.uri.includes(id));
      if (entity) {
        onSelect(entity.uri, name);
      }
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Add Service {kind === "listener" ? "Listener" : ""}
          </DialogTitle>
          <DialogDescription>
            Search for a service configuration to add to your bot
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as "my" | "discover")}
          className="flex-1 overflow-hidden flex flex-col"
        >
          <TabsList className="w-full">
            <TabsTrigger value="my" className="flex-1">
              My Configs
            </TabsTrigger>
            <TabsTrigger value="discover" className="flex-1">
              Discover
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="my"
            className="flex-1 overflow-y-auto space-y-2 mt-4"
          >
            {isLoadingMy ? (
              <LoadingState />
            ) : filteredMyConfigs.length === 0 ? (
              <EmptyState
                message="No matching configs found"
                showCreate
              />
            ) : (
              filteredMyConfigs.map((config) => (
                <ServiceConfigItem
                  key={config.configId}
                  id={config.configId}
                  name={config.name}
                  description={config.description}
                  kind={config.manifest.kind}
                  command={config.manifest.command}
                  tags={config.tags}
                  onSelect={() => handleSelect(config.configId, config.name, true)}
                />
              ))
            )}
          </TabsContent>

          <TabsContent
            value="discover"
            className="flex-1 overflow-y-auto space-y-2 mt-4"
          >
            {isLoadingSearch ? (
              <LoadingState />
            ) : !searchResults || searchResults.entities.length === 0 ? (
              <EmptyState
                message={
                  searchQuery
                    ? "No matching configs found in the network"
                    : "Search to discover service configs"
                }
              />
            ) : (
              searchResults.entities.map((entity) => (
                <ServiceConfigItem
                  key={entity.uri}
                  id={entity.uri}
                  name={entity.name}
                  description={entity.description}
                  kind={entity.kind as string}
                  tags={entity.tags}
                  author={entity.owner}
                  onSelect={() => handleSelect(entity.uri, entity.name, false)}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

interface ServiceConfigItemProps {
  id: string;
  name: string;
  description?: string;
  kind?: string;
  command?: string;
  tags?: string[];
  author?: string;
  onSelect: () => void;
}

function ServiceConfigItem({
  name,
  description,
  kind,
  command,
  tags,
  author,
  onSelect,
}: ServiceConfigItemProps) {
  const KindIcon =
    kind === "listener"
      ? Radio
      : kind === "command_flow"
      ? Workflow
      : Command;

  return (
    <button
      onClick={onSelect}
      className="w-full text-left p-4 rounded-lg border hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <KindIcon className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{name}</span>
        </div>
        <div className="flex items-center gap-2">
          {command && (
            <Badge variant="outline" className="text-xs">
              /{command}
            </Badge>
          )}
          <Badge variant="secondary" className="text-xs">
            {kind}
          </Badge>
        </div>
      </div>

      {description && (
        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
          {description}
        </p>
      )}

      <div className="flex items-center gap-2 mt-2">
        {tags?.slice(0, 3).map((tag) => (
          <Badge key={tag} variant="outline" className="text-xs">
            {tag}
          </Badge>
        ))}
        {author && (
          <span className="text-xs text-muted-foreground font-mono ml-auto">
            {author.slice(0, 8)}...
          </span>
        )}
      </div>
    </button>
  );
}

function LoadingState() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-4 rounded-lg border">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-2/3 mt-2" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  message,
  showCreate,
}: {
  message: string;
  showCreate?: boolean;
}) {
  return (
    <div className="text-center py-12">
      <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <p className="text-muted-foreground mb-4">{message}</p>
      {showCreate && (
        <Button asChild variant="outline">
          <Link href="/service-configs/new">
            <Plus className="h-4 w-4 mr-2" />
            Create New
          </Link>
        </Button>
      )}
    </div>
  );
}
