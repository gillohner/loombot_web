"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, GripVertical } from "lucide-react";
import type { JSONSchema } from "@/types/json-schema";
import { getSchemaDefault } from "@/lib/services/service-loader";
import { SchemaForm } from "../schema-form";

interface ArrayFieldProps {
  name: string;
  label: string;
  description?: string;
  itemSchema?: JSONSchema;
  value: unknown[];
  onChange: (value: unknown) => void;
  required?: boolean;
  disabled?: boolean;
  minItems?: number;
  maxItems?: number;
}

export function ArrayField({
  name,
  label,
  description,
  itemSchema,
  value,
  onChange,
  required = false,
  disabled = false,
  minItems,
  maxItems,
}: ArrayFieldProps) {
  const items = value || [];

  const handleAdd = useCallback(() => {
    if (maxItems !== undefined && items.length >= maxItems) return;

    const defaultValue = itemSchema ? getSchemaDefault(itemSchema) : "";
    onChange([...items, defaultValue]);
  }, [items, onChange, maxItems, itemSchema]);

  const handleRemove = useCallback(
    (index: number) => {
      if (minItems !== undefined && items.length <= minItems) return;
      onChange(items.filter((_, i) => i !== index));
    },
    [items, onChange, minItems]
  );

  const handleChange = useCallback(
    (index: number, newValue: unknown) => {
      const newItems = [...items];
      newItems[index] = newValue;
      onChange(newItems);
    },
    [items, onChange]
  );

  const canAdd = maxItems === undefined || items.length < maxItems;
  const canRemove = minItems === undefined || items.length > minItems;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={disabled || !canAdd}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Item
        </Button>
      </div>

      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}

      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={index}
            className={
              itemSchema?.type === "object"
                ? "flex flex-col gap-2 p-2 border rounded-lg"
                : "flex items-center gap-2"
            }
          >
            <div className="flex items-center gap-2 flex-1">
              {itemSchema?.type !== "object" && (
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
              )}
              <ArrayItemField
                itemSchema={itemSchema}
                value={item}
                onChange={(v) => handleChange(index, v)}
                disabled={disabled}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handleRemove(index)}
              disabled={disabled || !canRemove}
              className={itemSchema?.type === "object" ? "self-start" : ""}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}

        {items.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
            No items. Click &quot;Add Item&quot; to add one.
          </p>
        )}
      </div>

      {(minItems !== undefined || maxItems !== undefined) && (
        <p className="text-xs text-muted-foreground">
          {items.length} item{items.length !== 1 ? "s" : ""}
          {minItems !== undefined && ` (min: ${minItems})`}
          {maxItems !== undefined && ` (max: ${maxItems})`}
        </p>
      )}
    </div>
  );
}

interface ArrayItemFieldProps {
  itemSchema?: JSONSchema;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}

function ArrayItemField({
  itemSchema,
  value,
  onChange,
  disabled,
}: ArrayItemFieldProps) {
  // Simple string array by default
  if (!itemSchema || itemSchema.type === "string") {
    return (
      <Input
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="flex-1"
      />
    );
  }

  if (itemSchema.type === "number" || itemSchema.type === "integer") {
    return (
      <Input
        type="number"
        value={value !== undefined ? String(value) : ""}
        onChange={(e) => {
          const num =
            itemSchema.type === "integer"
              ? parseInt(e.target.value, 10)
              : parseFloat(e.target.value);
          onChange(isNaN(num) ? undefined : num);
        }}
        disabled={disabled}
        className="flex-1"
      />
    );
  }

  // For object types, render nested form
  if (itemSchema.type === "object" && itemSchema.properties) {
    return (
      <Card className="flex-1">
        <CardContent className="pt-4 pb-2">
          <SchemaForm
            schema={itemSchema}
            value={(value as Record<string, unknown>) || {}}
            onChange={onChange}
            disabled={disabled}
          />
        </CardContent>
      </Card>
    );
  }

  // For complex types without properties, show JSON
  return (
    <Input
      value={JSON.stringify(value)}
      onChange={(e) => {
        try {
          onChange(JSON.parse(e.target.value));
        } catch {
          // Keep current value on parse error
        }
      }}
      disabled={disabled}
      className="flex-1 font-mono text-xs"
    />
  );
}
