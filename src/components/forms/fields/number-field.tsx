"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface NumberFieldProps {
  name: string;
  label: string;
  description?: string;
  value: number | undefined;
  onChange: (value: unknown) => void;
  required?: boolean;
  disabled?: boolean;
  minimum?: number;
  maximum?: number;
  integer?: boolean;
}

export function NumberField({
  name,
  label,
  description,
  value,
  onChange,
  required = false,
  disabled = false,
  minimum,
  maximum,
  integer = false,
}: NumberFieldProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "") {
      onChange(undefined);
      return;
    }

    const num = integer ? parseInt(val, 10) : parseFloat(val);
    if (!isNaN(num)) {
      onChange(num);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>

      <Input
        id={name}
        type="number"
        value={value ?? ""}
        onChange={handleChange}
        disabled={disabled}
        min={minimum}
        max={maximum}
        step={integer ? 1 : "any"}
      />

      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}

      {(minimum !== undefined || maximum !== undefined) && (
        <p className="text-xs text-muted-foreground">
          {minimum !== undefined && `Min: ${minimum}`}
          {minimum !== undefined && maximum !== undefined && " | "}
          {maximum !== undefined && `Max: ${maximum}`}
        </p>
      )}
    </div>
  );
}
