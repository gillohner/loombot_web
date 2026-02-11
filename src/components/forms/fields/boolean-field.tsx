"use client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface BooleanFieldProps {
  name: string;
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}

export function BooleanField({
  name,
  label,
  description,
  value,
  onChange,
  disabled = false,
}: BooleanFieldProps) {
  return (
    <div className="flex items-center justify-between space-x-4 rounded-lg border p-4">
      <div className="space-y-0.5">
        <Label htmlFor={name} className="text-base">
          {label}
        </Label>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <Switch
        id={name}
        checked={value}
        onCheckedChange={(checked) => onChange(checked)}
        disabled={disabled}
      />
    </div>
  );
}
