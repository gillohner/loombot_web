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
  Database,
  MoreVertical,
  Pencil,
  Trash2,
  Copy,
  Plus,
} from "lucide-react";
import type { Dataset } from "@/types/dataset";

interface DatasetListProps {
  datasets: Dataset[];
  isLoading?: boolean;
  onDelete?: (id: string) => void;
  onCopyUri?: (id: string) => void;
}

export function DatasetList({
  datasets,
  isLoading,
  onDelete,
  onCopyUri,
}: DatasetListProps) {
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

  if (datasets.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Database className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Datasets Yet</h3>
          <p className="text-muted-foreground text-center mb-4">
            Create your first dataset to use with service configurations
          </p>
          <Button asChild>
            <Link href="/datasets/new">
              <Plus className="h-4 w-4 mr-2" />
              Create Dataset
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {datasets.map((dataset) => (
        <DatasetCard
          key={dataset.id}
          dataset={dataset}
          onDelete={onDelete}
          onCopyUri={onCopyUri}
        />
      ))}
    </div>
  );
}

interface DatasetCardProps {
  dataset: Dataset;
  onDelete?: (id: string) => void;
  onCopyUri?: (id: string) => void;
}

function DatasetCard({ dataset, onDelete, onCopyUri }: DatasetCardProps) {
  const dataPreview = getDataPreview(dataset.data);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{dataset.name}</CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/datasets/${dataset.id}`}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onCopyUri?.(dataset.id)}>
                <Copy className="h-4 w-4 mr-2" />
                Copy URI
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete?.(dataset.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {dataset.description && (
          <CardDescription className="line-clamp-2">
            {dataset.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="bg-muted rounded-lg p-3 font-mono text-xs text-muted-foreground overflow-hidden">
          <pre className="line-clamp-3">{dataPreview}</pre>
        </div>

        {dataset.tags && dataset.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {dataset.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {dataset.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{dataset.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        <div className="flex items-center justify-end mt-4">
          <span className="text-xs text-muted-foreground">
            {format(new Date(dataset.updatedAt), "MMM d, yyyy")}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function getDataPreview(data: unknown): string {
  try {
    const json = JSON.stringify(data, null, 2);
    return json.length > 200 ? json.slice(0, 200) + "..." : json;
  } catch {
    return String(data);
  }
}
