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
  Bot,
  MoreVertical,
  Pencil,
  Trash2,
  Copy,
  Plus,
  Settings,
  Radio,
} from "lucide-react";
import { useBotConfigs } from "@/hooks/use-bot-configs";
import { toast } from "sonner";
import type { BotConfig } from "@/types/bot-config";

interface BotConfigListProps {
  configs: BotConfig[];
  isLoading?: boolean;
  onDelete?: (id: string) => void;
}

export function BotConfigList({
  configs,
  isLoading,
  onDelete,
}: BotConfigListProps) {
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
          <Bot className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Bot Configs Yet</h3>
          <p className="text-muted-foreground text-center mb-4">
            Create your first bot configuration to get started
          </p>
          <Button asChild>
            <Link href="/configs/new">
              <Plus className="h-4 w-4 mr-2" />
              Create Bot Config
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {configs.map((config) => (
        <BotConfigCard
          key={config.configId}
          config={config}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

interface BotConfigCardProps {
  config: BotConfig;
  onDelete?: (id: string) => void;
}

function BotConfigCard({ config, onDelete }: BotConfigCardProps) {
  const { getUri } = useBotConfigs();
  const configUri = getUri?.(config.configId);
  const setConfigCommand = configUri ? `/setconfig ${configUri}` : "";

  const handleCopyCommand = () => {
    if (setConfigCommand) {
      navigator.clipboard.writeText(setConfigCommand);
      toast.success("Command copied to clipboard!");
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{config.name}</CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {setConfigCommand && (
                <DropdownMenuItem onClick={handleCopyCommand}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy /setconfig
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <Link href={`/configs/${config.configId}`}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
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
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Settings className="h-4 w-4" />
            <span>{config.services.length} commands</span>
          </div>
          <div className="flex items-center gap-1">
            <Radio className="h-4 w-4" />
            <span>{config.listeners.length} listeners</span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <Badge variant="outline" className="text-xs">
            v{config.version}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Updated {format(new Date(config.updatedAt), "MMM d, yyyy")}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
