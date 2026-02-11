"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Settings,
  MoreVertical,
  Pencil,
  Trash2,
  Copy,
  Plus,
  ExternalLink,
  Command,
  Radio,
  Workflow,
} from "lucide-react";
import type { ServiceConfig } from "@/types/service-config";

interface ServiceConfigListProps {
  configs: ServiceConfig[];
  isLoading?: boolean;
  onDelete?: (id: string) => void;
  onCopyUri?: (id: string) => void;
}

export function ServiceConfigList({
  configs,
  isLoading,
  onDelete,
  onCopyUri,
}: ServiceConfigListProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (configs.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Settings className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Service Configs Yet</h3>
          <p className="text-muted-foreground text-center mb-4">
            Create your first service configuration to get started
          </p>
          <Button asChild>
            <Link href="/service-configs/new">
              <Plus className="h-4 w-4 mr-2" />
              Create Service Config
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {configs.map((config) => (
        <ServiceConfigCard
          key={config.configId}
          config={config}
          onDelete={onDelete}
          onCopyUri={onCopyUri}
        />
      ))}
    </div>
  );
}

interface ServiceConfigCardProps {
  config: ServiceConfig;
  onDelete?: (id: string) => void;
  onCopyUri?: (id: string) => void;
}

function ServiceConfigCard({
  config,
  onDelete,
  onCopyUri,
}: ServiceConfigCardProps) {
  const kindIcon = {
    single_command: Command,
    command_flow: Workflow,
    listener: Radio,
  }[config.manifest.kind];

  const KindIcon = kindIcon || Settings;

  // Reconstruct GitHub URL from structured source
  const getSourceUrl = () => {
    if (config.source.type === "github") {
      const base = `https://github.com/${config.source.location}`;
      if (config.source.entry) {
        const branch = config.source.version || "main";
        return `${base}/tree/${branch}/${config.source.entry}`;
      }
      return base;
    }
    return undefined;
  };
  const sourceUrl = getSourceUrl();

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <KindIcon className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{config.name}</CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/service-configs/${config.configId}`}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onCopyUri?.(config.configId)}>
                <Copy className="h-4 w-4 mr-2" />
                Copy URI
              </DropdownMenuItem>
              {sourceUrl && (
                <DropdownMenuItem asChild>
                  <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Source
                  </a>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete?.(config.configId)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {config.description && (
          <CardDescription className="line-clamp-2">
            {config.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1 mb-3">
          <Badge variant="secondary">{config.manifest.kind}</Badge>
          {config.manifest.command && (
            <Badge variant="outline">/{config.manifest.command}</Badge>
          )}
        </div>

        {config.tags && config.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {config.tags.slice(0, 3).map((tag, index) => (
              <Badge key={`${tag}-${index}`} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {config.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{config.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-muted-foreground font-mono truncate max-w-[150px]">
            {config.manifest.serviceId}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(config.updatedAt), "MMM d, yyyy")}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
