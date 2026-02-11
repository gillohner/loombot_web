"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface StringFieldProps {
  name: string;
  label: string;
  description?: string;
  value: string;
  onChange: (value: unknown) => void;
  required?: boolean;
  disabled?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
}

export function StringField({
  name,
  label,
  description,
  value,
  onChange,
  required = false,
  disabled = false,
  minLength,
  maxLength,
  pattern,
  format,
}: StringFieldProps) {
  const isMultiline = format === "textarea" || (maxLength && maxLength > 200);
  const isUrl = format === "uri" || format === "url";
  const isEmail = format === "email";

  const inputType = isEmail ? "email" : isUrl ? "url" : "text";

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>

      {isMultiline ? (
        <Textarea
          id={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={description}
          minLength={minLength}
          maxLength={maxLength}
          rows={4}
        />
      ) : (
        <Input
          id={name}
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={description}
          minLength={minLength}
          maxLength={maxLength}
          pattern={pattern}
        />
      )}

      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}

      {maxLength && (
        <p className="text-xs text-muted-foreground text-right">
          {value.length}/{maxLength}
        </p>
      )}
    </div>
  );
}
