"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface EnumFieldProps {
  name: string;
  label: string;
  description?: string;
  options: unknown[];
  value: string;
  onChange: (value: unknown) => void;
  required?: boolean;
  disabled?: boolean;
}

export function EnumField({
  name,
  label,
  description,
  options,
  value,
  onChange,
  required = false,
  disabled = false,
}: EnumFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>

      <Select
        value={String(value)}
        onValueChange={(v) => onChange(v)}
        disabled={disabled}
      >
        <SelectTrigger id={name}>
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={String(option)} value={String(option)}>
              {formatOptionLabel(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

function formatOptionLabel(option: unknown): string {
  if (typeof option === "string") {
    return option
      .replace(/([A-Z])/g, " $1")
      .replace(/_/g, " ")
      .replace(/^\w/, (c) => c.toUpperCase())
      .trim();
  }
  return String(option);
}
