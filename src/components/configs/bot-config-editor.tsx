"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  Loader2,
  Settings,
  Radio,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { useBotConfigs } from "@/hooks/use-bot-configs";
import type { BotConfig, ServiceReference } from "@/types/bot-config";
import type { ServiceConfig } from "@/types/service-config";
import { ServiceConfigSearch } from "../service-configs/service-config-search";
import { toast } from "sonner";
import { pubkyClient } from "@/lib/pubky/client";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

type FormData = z.infer<typeof formSchema>;

interface BotConfigEditorProps {
  config?: BotConfig | null;
  isNew?: boolean;
}

export function BotConfigEditor({ config, isNew = false }: BotConfigEditorProps) {
  const router = useRouter();
  const { create, update, isCreating, isUpdating } = useBotConfigs();

  const [services, setServices] = useState<ServiceReference[]>(
    config?.services || []
  );
  const [listeners, setListeners] = useState<ServiceReference[]>(
    config?.listeners || []
  );
  const [showServiceSearch, setShowServiceSearch] = useState(false);
  const [searchType, setSearchType] = useState<"service" | "listener">("service");

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: config?.name || "",
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      if (isNew) {
        await create({
          ...data,
          services,
          listeners,
        });
      } else if (config) {
        await update({
          id: config.configId,
          data: {
            ...data,
            services,
            listeners,
          },
        });
      }
      router.push("/configs");
    } catch {
      // Error handled by mutation
    }
  };

  const handleAddService = (type: "service" | "listener") => {
    setSearchType(type);
    setShowServiceSearch(true);
  };

  const handleServiceSelected = (uri: string, name: string) => {
    const ref: ServiceReference = {
      serviceConfigRef: uri,
      enabled: true,
    };

    if (searchType === "service") {
      setServices([...services, ref]);
    } else {
      setListeners([...listeners, ref]);
    }

    setShowServiceSearch(false);
    toast.success(`Added "${name}"`);
  };

  const handleRemoveService = (index: number, type: "service" | "listener") => {
    if (type === "service") {
      setServices(services.filter((_, i) => i !== index));
    } else {
      setListeners(listeners.filter((_, i) => i !== index));
    }
  };

  const handleToggleEnabled = (
    index: number,
    enabled: boolean,
    type: "service" | "listener"
  ) => {
    if (type === "service") {
      const updated = [...services];
      updated[index] = { ...updated[index], enabled };
      setServices(updated);
    } else {
      const updated = [...listeners];
      updated[index] = { ...updated[index], enabled };
      setListeners(updated);
    }
  };

  const handleUpdateCommandOverride = (
    index: number,
    command: string | undefined,
    type: "service" | "listener"
  ) => {
    if (type === "service") {
      const updated = [...services];
      const current = updated[index];
      updated[index] = {
        ...current,
        overrides: command
          ? { ...current.overrides, command }
          : { ...current.overrides, command: undefined },
      };
      setServices(updated);
    } else {
      const updated = [...listeners];
      const current = updated[index];
      updated[index] = {
        ...current,
        overrides: command
          ? { ...current.overrides, command }
          : { ...current.overrides, command: undefined },
      };
      setListeners(updated);
    }
  };

  const isLoading = isCreating || isUpdating;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">
          {isNew ? "Create Bot Config" : "Edit Bot Config"}
        </h1>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Info</CardTitle>
            <CardDescription>
              Give your bot configuration a name and description
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                {...form.register("name")}
                placeholder="My Telegram Bot"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Commands
                </CardTitle>
                <CardDescription>
                  Services that respond to specific commands
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleAddService("service")}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Command
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ServiceReferenceList
              references={services}
              onRemove={(i) => handleRemoveService(i, "service")}
              onToggle={(i, enabled) => handleToggleEnabled(i, enabled, "service")}
              onCommandOverride={(i, cmd) => handleUpdateCommandOverride(i, cmd, "service")}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Radio className="h-5 w-5" />
                  Listeners
                </CardTitle>
                <CardDescription>
                  Services that monitor all messages
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleAddService("listener")}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Listener
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ServiceReferenceList
              references={listeners}
              onRemove={(i) => handleRemoveService(i, "listener")}
              onToggle={(i, enabled) => handleToggleEnabled(i, enabled, "listener")}
              onCommandOverride={(i, cmd) => handleUpdateCommandOverride(i, cmd, "listener")}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isNew ? "Create" : "Save"}
              </>
            )}
          </Button>
        </div>
      </form>

      {showServiceSearch && (
        <ServiceConfigSearch
          kind={searchType === "listener" ? "listener" : "command"}
          onSelect={handleServiceSelected}
          onClose={() => setShowServiceSearch(false)}
        />
      )}
    </div>
  );
}

interface ServiceReferenceListProps {
  references: ServiceReference[];
  onRemove: (index: number) => void;
  onToggle: (index: number, enabled: boolean) => void;
  onCommandOverride: (index: number, command: string | undefined) => void;
}

function ServiceReferenceList({
  references,
  onRemove,
  onToggle,
  onCommandOverride,
}: ServiceReferenceListProps) {
  if (references.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
        No services added yet. Click &quot;Add&quot; to add one.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {references.map((ref, index) => (
        <ServiceReferenceItem
          key={index}
          reference={ref}
          onRemove={() => onRemove(index)}
          onToggle={(enabled) => onToggle(index, enabled)}
          onCommandOverride={(cmd) => onCommandOverride(index, cmd)}
        />
      ))}
    </div>
  );
}

interface ServiceReferenceItemProps {
  reference: ServiceReference;
  onRemove: () => void;
  onToggle: (enabled: boolean) => void;
  onCommandOverride: (command: string | undefined) => void;
}

function ServiceReferenceItem({
  reference,
  onRemove,
  onToggle,
  onCommandOverride,
}: ServiceReferenceItemProps) {
  const [serviceData, setServiceData] = useState<ServiceConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingCommand, setIsEditingCommand] = useState(false);
  const [commandInput, setCommandInput] = useState(reference.overrides?.command || "");

  useEffect(() => {
    async function fetchServiceData() {
      try {
        setIsLoading(true);
        const data = await pubkyClient.read<ServiceConfig>(reference.serviceConfigRef);
        setServiceData(data);
      } catch (error) {
        console.error("Failed to load service config:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchServiceData();
  }, [reference.serviceConfigRef]);

  const handleSaveCommand = () => {
    onCommandOverride(commandInput.trim() || undefined);
    setIsEditingCommand(false);
  };

  const handleCancelEdit = () => {
    setCommandInput(reference.overrides?.command || "");
    setIsEditingCommand(false);
  };

  const displayCommand = reference.overrides?.command || serviceData?.command;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Switch
          checked={reference.enabled !== false}
          onCheckedChange={onToggle}
        />
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="text-sm text-muted-foreground">Loading...</span>
            </div>
          ) : serviceData ? (
            <>
              <p className="font-medium truncate">{serviceData.name}</p>
              {serviceData.description && (
                <p className="text-sm text-muted-foreground truncate">
                  {serviceData.description}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1">
                {isEditingCommand ? (
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">/</span>
                    <Input
                      value={commandInput}
                      onChange={(e) => setCommandInput(e.target.value)}
                      className="h-6 w-24 text-xs"
                      placeholder={serviceData.command || "command"}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveCommand();
                        if (e.key === "Escape") handleCancelEdit();
                      }}
                      autoFocus
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={handleSaveCommand}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={handleCancelEdit}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    {reference.overrides?.command ? (
                      <Badge
                        variant="outline"
                        className="text-xs cursor-pointer hover:bg-accent"
                        onClick={() => setIsEditingCommand(true)}
                      >
                        /{reference.overrides.command}
                        <Pencil className="h-2 w-2 ml-1" />
                      </Badge>
                    ) : displayCommand ? (
                      <Badge
                        variant="secondary"
                        className="text-xs cursor-pointer hover:bg-accent"
                        onClick={() => setIsEditingCommand(true)}
                      >
                        /{displayCommand}
                        <Pencil className="h-2 w-2 ml-1" />
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-xs cursor-pointer hover:bg-accent"
                        onClick={() => setIsEditingCommand(true)}
                      >
                        Set command
                        <Pencil className="h-2 w-2 ml-1" />
                      </Badge>
                    )}
                  </>
                )}
                <Badge variant="outline" className="text-xs">
                  {serviceData.kind || serviceData.manifest.kind}
                </Badge>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground font-mono truncate">
              {reference.serviceConfigRef}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
