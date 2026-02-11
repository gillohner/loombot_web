"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Save,
  Loader2,
  Check,
  AlertCircle,
  Link as LinkIcon,
  X,
} from "lucide-react";
import { useServiceConfigs } from "@/hooks/use-service-configs";
import { useServiceSchema } from "@/hooks/use-service-schema";
import { useDatasets } from "@/hooks/use-datasets";
import { SchemaForm } from "@/components/forms/schema-form";
import { generateDefaultConfig } from "@/lib/services/service-loader";
import type { ServiceConfig } from "@/types/service-config";
import type { DatasetSchemas } from "@/types/json-schema";

// Preset core services available on GitHub
const CORE_SERVICE_PRESETS = [
  {
    id: "simple-response",
    name: "Simple Response",
    description: "Responds with a configured message when a command is invoked",
    kind: "single_command",
    url: "https://github.com/gillohner/pubky_bot_builder_telegram/tree/master/packages/core_services/simple-response",
  },
  {
    id: "triggerwords",
    name: "Trigger Words",
    description: "Responds with jokes when trigger words are detected in messages",
    kind: "listener",
    url: "https://github.com/gillohner/pubky_bot_builder_telegram/tree/master/packages/core_services/triggerwords",
  },
  {
    id: "url-cleaner",
    name: "URL Cleaner",
    description: "Automatically cleans tracking parameters from URLs and suggests privacy-friendly alternatives",
    kind: "listener",
    url: "https://github.com/gillohner/pubky_bot_builder_telegram/tree/master/packages/core_services/url-cleaner",
  },
  {
    id: "new-member",
    name: "New Member Welcome",
    description: "Welcomes new members when they join a group",
    kind: "listener",
    url: "https://github.com/gillohner/pubky_bot_builder_telegram/tree/master/packages/core_services/new-member",
  },
] as const;

const formSchema = z.object({
  source: z.string().url("Must be a valid URL"),
  command: z.string().regex(/^[a-z0-9_]*$/, "Command must be lowercase letters, numbers, or underscores only").optional(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  tags: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ServiceConfigEditorProps {
  config?: ServiceConfig | null;
  isNew?: boolean;
}

export function ServiceConfigEditor({
  config,
  isNew = false,
}: ServiceConfigEditorProps) {
  const router = useRouter();
  const { create, update, isCreating, isUpdating } = useServiceConfigs();
  const { create: createDataset, getUri: getDatasetUri } = useDatasets();

  const [sourceUrl, setSourceUrl] = useState(config?.source || "");
  const [isServiceLocked, setIsServiceLocked] = useState(!!config?.source);
  const [serviceConfig, setServiceConfig] = useState<Record<string, unknown>>(
    config?.config || {}
  );
  const [datasetValues, setDatasetValues] = useState<Record<string, unknown>>(
    {}
  );

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      source: config?.source || "",
      command: config?.command || config?.manifest?.command || "",
      name: config?.name || "",
      description: config?.description || "",
      tags: config?.tags?.join(", ") || "",
    },
  });

  const {
    data: loadedService,
    isLoading: isLoadingSchema,
    error: schemaError,
  } = useServiceSchema(sourceUrl);

  // Compute effective config - use defaults if no config and schema exists
  const effectiveConfig = loadedService?.manifest.configSchema &&
    Object.keys(serviceConfig).length === 0
    ? generateDefaultConfig(loadedService.manifest.configSchema)
    : serviceConfig;

  // Auto-populate name from manifest and initialize config with defaults
  useEffect(() => {
    if (loadedService) {
      // Auto-populate command if new and empty
      if (isNew && !form.getValues("command") && loadedService.manifest.command) {
        form.setValue("command", loadedService.manifest.command);
      }

      // Auto-populate name if new and empty
      if (isNew && !form.getValues("name") && loadedService.manifest.serviceId) {
        const name = loadedService.manifest.serviceId
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
        form.setValue("name", name);
      }

      // Initialize config with defaults if schema exists and config is empty
      if (
        loadedService.manifest.configSchema &&
        Object.keys(serviceConfig).length === 0
      ) {
        const defaults = generateDefaultConfig(loadedService.manifest.configSchema);
        setServiceConfig(defaults);
      }

      // Initialize dataset values - load existing or use defaults
      if (loadedService.manifest.datasetSchemas) {
        const loadDatasets = async () => {
          const initialDatasets: Record<string, unknown> = {};

          for (const [name, def] of Object.entries(loadedService.manifest.datasetSchemas)) {
            // If editing and dataset URI exists, load it
            if (!isNew && config?.datasets?.[name]) {
              try {
                const datasetUri = config.datasets[name];
                const dataset = await import("@/lib/pubky/client").then(m =>
                  m.pubkyClient.read(datasetUri)
                );
                if (dataset && typeof dataset === 'object' && 'data' in dataset) {
                  initialDatasets[name] = (dataset as { data: unknown }).data;
                } else {
                  // Fallback to defaults if data structure unexpected
                  initialDatasets[name] = generateDefaultConfig(def.schema);
                }
              } catch (error) {
                console.error(`Failed to load dataset ${name}:`, error);
                // Fallback to defaults on error
                initialDatasets[name] = generateDefaultConfig(def.schema);
              }
            } else {
              // Use defaults for new configs or missing datasets
              initialDatasets[name] = generateDefaultConfig(def.schema);
            }
          }

          setDatasetValues(initialDatasets);
        };

        loadDatasets();
      }
    }
  }, [loadedService, isNew, form, serviceConfig, config]);

  const handleLoadSource = () => {
    const url = form.getValues("source");
    if (url) {
      setSourceUrl(url);
      setIsServiceLocked(true);
    }
  };

  const handleUnloadSource = () => {
    setSourceUrl("");
    setIsServiceLocked(false);
    setServiceConfig({});
    setDatasetValues({});
  };

  const onSubmit = async (data: FormData) => {
    if (!loadedService) {
      return;
    }

    const tags = data.tags
      ?.split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      // Create datasets first and get their URIs
      const datasetUris: Record<string, string> = {};
      if (loadedService.manifest.datasetSchemas) {
        for (const [name, def] of Object.entries(
          loadedService.manifest.datasetSchemas
        )) {
          const datasetData = datasetValues[name];
          if (datasetData) {
            const dataset = await createDataset({
              name: `${data.name} - ${name}`,
              description: def.description,
              schemaSource: data.source,
              schemaDatasetName: name,
              data: datasetData,
            });
            const uri = getDatasetUri(dataset.id);
            if (uri) {
              datasetUris[name] = uri;
            }
          }
        }
      }

      if (isNew) {
        await create({
          data: {
            source: data.source,
            command: data.command,
            name: data.name,
            description: data.description,
            tags,
            config: effectiveConfig,
            datasets: datasetUris,
          },
          loadedService,
        });
      } else if (config) {
        await update({
          id: config.id,
          data: {
            source: data.source,
            command: data.command,
            name: data.name,
            description: data.description,
            tags,
            config: effectiveConfig,
            datasets: datasetUris,
          },
        });
      }
      router.push("/service-configs");
    } catch {
      // Error handled by mutation
    }
  };

  const isLoading = isCreating || isUpdating;
  const hasSchema = loadedService?.manifest.configSchema;
  const hasDatasets = loadedService?.manifest.datasetSchemas;

  const handleDatasetChange = (name: string, value: unknown) => {
    setDatasetValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">
          {isNew ? "Create Service Config" : "Edit Service Config"}
        </h1>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Source URL */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              Service Source
            </CardTitle>
            <CardDescription>
              Select a preset service or enter a custom Git URL
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Preset selector */}
            {!isServiceLocked && (
              <div className="space-y-2">
                <Label>Quick Select (Core Services)</Label>
                <Select
                  onValueChange={(value) => {
                    const preset = CORE_SERVICE_PRESETS.find(p => p.id === value);
                    if (preset) {
                      form.setValue("source", preset.url);
                      setSourceUrl(preset.url);
                      setIsServiceLocked(true);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a preset service..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CORE_SERVICE_PRESETS.map((preset) => (
                      <SelectItem key={preset.id} value={preset.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{preset.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {preset.kind === "listener" ? "Listener" : "Command"}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Or enter a custom URL below
                </p>
              </div>
            )}

            {/* Custom URL input */}
            <div className="flex gap-2">
              <Input
                {...form.register("source")}
                placeholder="https://github.com/user/repo/tree/main/services/my-service"
                className="flex-1"
                disabled={isServiceLocked}
              />
              {!isServiceLocked ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleLoadSource}
                  disabled={isLoadingSchema}
                >
                  {isLoadingSchema ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Load"
                  )}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleUnloadSource}
                  title="Unload service"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {form.formState.errors.source && (
              <p className="text-sm text-destructive">
                {form.formState.errors.source.message}
              </p>
            )}

            {schemaError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Failed to load service:{" "}
                  {schemaError instanceof Error
                    ? schemaError.message
                    : "Unknown error"}
                </AlertDescription>
              </Alert>
            )}

            {loadedService && (
              <Alert>
                <Check className="h-4 w-4" />
                <AlertDescription className="flex items-center gap-2">
                  <span>Loaded:</span>
                  <Badge>{loadedService.manifest.serviceId}</Badge>
                  <Badge variant="outline">{loadedService.manifest.kind}</Badge>
                  {loadedService.manifest.command && (
                    <Badge variant="secondary">
                      /{loadedService.manifest.command}
                    </Badge>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Metadata */}
        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
            <CardDescription>
              Configure the command trigger and give this configuration a descriptive name
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadedService?.manifest.kind !== "listener" && (
              <div className="space-y-2">
                <Label htmlFor="command">Command</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">/</span>
                  <Input
                    id="command"
                    {...form.register("command")}
                    placeholder="mycommand"
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  The command users will type to trigger this service (without the leading /)
                </p>
                {form.formState.errors.command && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.command.message}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                {...form.register("name")}
                placeholder="My URL Cleaner"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...form.register("description")}
                placeholder="What does this service configuration do?"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                {...form.register("tags")}
                placeholder="privacy, links, cleaning"
              />
            </div>
          </CardContent>
        </Card>

        {/* Service Configuration */}
        {isLoadingSchema && (
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-60" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        )}

        {loadedService && hasSchema && (
          <Card>
            <CardHeader>
              <CardTitle>Service Configuration</CardTitle>
              <CardDescription>
                Configure the service settings based on its schema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SchemaForm
                schema={loadedService.manifest.configSchema!}
                value={effectiveConfig}
                onChange={setServiceConfig}
              />
            </CardContent>
          </Card>
        )}

        {loadedService && !hasSchema && (
          <Card>
            <CardContent className="py-6 text-center text-muted-foreground">
              This service has no configurable options.
            </CardContent>
          </Card>
        )}

        {/* Datasets */}
        {loadedService && hasDatasets && (
          <>
            {Object.entries(loadedService.manifest.datasetSchemas!).map(
              ([name, def]) => (
                <Card key={name}>
                  <CardHeader>
                    <CardTitle className="capitalize">
                      {name.replace(/-/g, " ").replace(/_/g, " ")}
                    </CardTitle>
                    <CardDescription>
                      {def.description || `Configure ${name} dataset`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SchemaForm
                      schema={def.schema}
                      value={(datasetValues[name] as Record<string, unknown>) || {}}
                      onChange={(value) => handleDatasetChange(name, value)}
                    />
                  </CardContent>
                </Card>
              )
            )}
          </>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading || !loadedService}
          >
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
    </div>
  );
}
