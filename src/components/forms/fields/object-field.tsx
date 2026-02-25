"use client";

import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { SchemaForm } from "../schema-form";
import type { JSONSchema } from "@/types/json-schema";

interface ObjectFieldProps {
  name?: string;
  label: string;
  description?: string;
  schema: JSONSchema;
  value: Record<string, unknown>;
  onChange: (value: unknown) => void;
  required?: boolean;
  disabled?: boolean;
}

export function ObjectField({
  label,
  description,
  schema,
  value,
  onChange,
  required = false,
  disabled = false,
}: ObjectFieldProps) {
  if (!schema.properties) {
    return (
      <div className="text-muted-foreground text-sm">
        Object schema must have properties
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>

      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}

      <Card>
        <CardContent className="pt-4">
          <SchemaForm
            schema={schema}
            value={value}
            onChange={(v) => onChange(v)}
            disabled={disabled}
          />
        </CardContent>
      </Card>
    </div>
  );
}
