"use client";

import { useCallback } from "react";
import type { JSONSchema } from "@/types/json-schema";
import { StringField } from "./fields/string-field";
import { NumberField } from "./fields/number-field";
import { BooleanField } from "./fields/boolean-field";
import { ArrayField } from "./fields/array-field";
import { ObjectField } from "./fields/object-field";
import { EnumField } from "./fields/enum-field";

export interface SchemaFormProps {
  schema: JSONSchema;
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
  disabled?: boolean;
  className?: string;
}

export function SchemaForm({
  schema,
  value,
  onChange,
  disabled = false,
  className = "",
}: SchemaFormProps) {
  const handleFieldChange = useCallback(
    (fieldName: string, fieldValue: unknown) => {
      onChange({
        ...value,
        [fieldName]: fieldValue,
      });
    },
    [value, onChange]
  );

  if (schema.type !== "object" || !schema.properties) {
    return (
      <div className="text-muted-foreground text-sm">
        Schema must be an object with properties
      </div>
    );
  }

  const required = schema.required || [];

  return (
    <div className={`space-y-6 ${className}`}>
      {Object.entries(schema.properties).map(([fieldName, fieldSchema]) => (
        <SchemaField
          key={fieldName}
          name={fieldName}
          schema={fieldSchema}
          value={value[fieldName]}
          onChange={(v) => handleFieldChange(fieldName, v)}
          required={required.includes(fieldName)}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

interface SchemaFieldProps {
  name: string;
  schema: JSONSchema;
  value: unknown;
  onChange: (value: unknown) => void;
  required?: boolean;
  disabled?: boolean;
}

export function SchemaField({
  name,
  schema,
  value,
  onChange,
  required = false,
  disabled = false,
}: SchemaFieldProps) {
  const label = schema.title || formatLabel(name);
  const description = schema.description;

  // Handle enum types
  if (schema.enum && schema.enum.length > 0) {
    return (
      <EnumField
        name={name}
        label={label}
        description={description}
        options={schema.enum}
        value={value as string}
        onChange={onChange}
        required={required}
        disabled={disabled}
      />
    );
  }

  // Handle by type
  switch (schema.type) {
    case "string":
      return (
        <StringField
          name={name}
          label={label}
          description={description}
          value={(value as string) ?? ""}
          onChange={onChange}
          required={required}
          disabled={disabled}
          minLength={schema.minLength}
          maxLength={schema.maxLength}
          pattern={schema.pattern}
          format={schema.format}
        />
      );

    case "number":
    case "integer":
      return (
        <NumberField
          name={name}
          label={label}
          description={description}
          value={(value as number) ?? undefined}
          onChange={onChange}
          required={required}
          disabled={disabled}
          minimum={schema.minimum}
          maximum={schema.maximum}
          integer={schema.type === "integer"}
        />
      );

    case "boolean":
      return (
        <BooleanField
          name={name}
          label={label}
          description={description}
          value={(value as boolean) ?? false}
          onChange={onChange}
          disabled={disabled}
        />
      );

    case "array":
      return (
        <ArrayField
          name={name}
          label={label}
          description={description}
          itemSchema={schema.items as JSONSchema}
          value={(value as unknown[]) ?? []}
          onChange={onChange}
          required={required}
          disabled={disabled}
          minItems={schema.minItems}
          maxItems={schema.maxItems}
        />
      );

    case "object":
      return (
        <ObjectField
          name={name}
          label={label}
          description={description}
          schema={schema}
          value={(value as Record<string, unknown>) ?? {}}
          onChange={onChange}
          required={required}
          disabled={disabled}
        />
      );

    default:
      return (
        <div className="text-muted-foreground text-sm">
          Unsupported field type: {schema.type || "unknown"}
        </div>
      );
  }
}

function formatLabel(name: string): string {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}
