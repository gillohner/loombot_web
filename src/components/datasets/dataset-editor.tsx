"use client";

import { useState } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Save, Loader2, AlertCircle, Database } from "lucide-react";
import { useDatasets } from "@/hooks/use-datasets";
import { SchemaForm } from "@/components/forms/schema-form";
import type { Dataset } from "@/types/dataset";
import type { JSONSchema } from "@/types/json-schema";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  tags: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface DatasetEditorProps {
  dataset?: Dataset | null;
  isNew?: boolean;
  schema?: JSONSchema;
}

export function DatasetEditor({
  dataset,
  isNew = false,
  schema,
}: DatasetEditorProps) {
  const router = useRouter();
  const { create, update, isCreating, isUpdating } = useDatasets();

  const [dataValue, setDataValue] = useState<unknown>(dataset?.data || {});
  const [jsonText, setJsonText] = useState(
    dataset?.data ? JSON.stringify(dataset.data, null, 2) : "{}"
  );
  const [jsonError, setJsonError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: dataset?.name || "",
      description: dataset?.description || "",
      tags: dataset?.tags?.join(", ") || "",
    },
  });

  // Compute JSON text directly from dataValue when using schema
  const computedJsonText = schema ? JSON.stringify(dataValue, null, 2) : jsonText;

  const handleJsonChange = (text: string) => {
    setJsonText(text);
    try {
      const parsed = JSON.parse(text);
      setDataValue(parsed);
      setJsonError(null);
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : "Invalid JSON");
    }
  };

  const onSubmit = async (data: FormData) => {
    if (jsonError) {
      return;
    }

    const tags = data.tags
      ?.split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      if (isNew) {
        await create({
          name: data.name,
          description: data.description,
          tags,
          data: dataValue,
        });
        router.push("/datasets");
      } else if (dataset) {
        await update({
          id: dataset.id,
          data: {
            name: data.name,
            description: data.description,
            tags,
            data: dataValue,
          },
        });
      }
    } catch (error) {
      // Error handled by mutation
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
          {isNew ? "Create Dataset" : "Edit Dataset"}
        </h1>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Metadata */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Dataset Info
            </CardTitle>
            <CardDescription>
              Give your dataset a name and description
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                {...form.register("name")}
                placeholder="My Dataset"
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
                placeholder="What is this dataset for?"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                {...form.register("tags")}
                placeholder="jokes, funny, random"
              />
            </div>
          </CardContent>
        </Card>

        {/* Data */}
        <Card>
          <CardHeader>
            <CardTitle>Data</CardTitle>
            <CardDescription>
              {schema
                ? "Fill in the data using the schema-driven form"
                : "Enter the dataset content as JSON"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {schema ? (
              <SchemaForm
                schema={schema}
                value={dataValue as Record<string, unknown>}
                onChange={setDataValue}
              />
            ) : (
              <div className="space-y-2">
                <Textarea
                  value={computedJsonText}
                  onChange={(e) => handleJsonChange(e.target.value)}
                  className="font-mono text-sm min-h-[300px]"
                  placeholder='{"key": "value"}'
                />
                {jsonError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{jsonError}</AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || !!jsonError}>
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
