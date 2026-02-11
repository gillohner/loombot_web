import { describe, it, expect } from "vitest";
import type { JSONSchema } from "@/types/json-schema";

// Pure logic tests for schema form functionality
// Testing the logic without rendering React components

describe("SchemaForm Logic", () => {
  describe("getSchemaDefault", () => {
    const getSchemaDefault = (schema: JSONSchema): unknown => {
      if (schema.default !== undefined) return schema.default;
      
      switch (schema.type) {
        case "string":
          return "";
        case "number":
        case "integer":
          return 0;
        case "boolean":
          return false;
        case "array":
          return [];
        case "object":
          if (schema.properties) {
            const obj: Record<string, unknown> = {};
            for (const [key, propSchema] of Object.entries(schema.properties)) {
              obj[key] = getSchemaDefault(propSchema as JSONSchema);
            }
            return obj;
          }
          return {};
        default:
          return null;
      }
    };

    it("should return default value if specified", () => {
      const schema: JSONSchema = {
        type: "string",
        default: "hello",
      };
      expect(getSchemaDefault(schema)).toBe("hello");
    });

    it("should return empty string for string type", () => {
      const schema: JSONSchema = { type: "string" };
      expect(getSchemaDefault(schema)).toBe("");
    });

    it("should return 0 for number type", () => {
      const schema: JSONSchema = { type: "number" };
      expect(getSchemaDefault(schema)).toBe(0);
    });

    it("should return 0 for integer type", () => {
      const schema: JSONSchema = { type: "integer" };
      expect(getSchemaDefault(schema)).toBe(0);
    });

    it("should return false for boolean type", () => {
      const schema: JSONSchema = { type: "boolean" };
      expect(getSchemaDefault(schema)).toBe(false);
    });

    it("should return empty array for array type", () => {
      const schema: JSONSchema = { type: "array" };
      expect(getSchemaDefault(schema)).toEqual([]);
    });

    it("should return object with default properties", () => {
      const schema: JSONSchema = {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" },
        },
      };
      expect(getSchemaDefault(schema)).toEqual({ name: "", age: 0 });
    });
  });

  describe("Field type detection", () => {
    type FieldType = "text" | "textarea" | "number" | "boolean" | "select" | "array";
    
    const getFieldType = (schema: JSONSchema): FieldType => {
      if (schema.enum) return "select";
      
      switch (schema.type) {
        case "string":
          if (schema.format === "textarea" || (schema.maxLength && schema.maxLength > 100)) {
            return "textarea";
          }
          return "text";
        case "number":
        case "integer":
          return "number";
        case "boolean":
          return "boolean";
        case "array":
          return "array";
        default:
          return "text";
      }
    };

    it("should detect text field", () => {
      const schema: JSONSchema = { type: "string" };
      expect(getFieldType(schema)).toBe("text");
    });

    it("should detect textarea for long strings", () => {
      const schema: JSONSchema = { type: "string", maxLength: 500 };
      expect(getFieldType(schema)).toBe("textarea");
    });

    it("should detect textarea for textarea format", () => {
      const schema: JSONSchema = { type: "string", format: "textarea" };
      expect(getFieldType(schema)).toBe("textarea");
    });

    it("should detect number field", () => {
      const schema: JSONSchema = { type: "number" };
      expect(getFieldType(schema)).toBe("number");
    });

    it("should detect integer field as number", () => {
      const schema: JSONSchema = { type: "integer" };
      expect(getFieldType(schema)).toBe("number");
    });

    it("should detect boolean field", () => {
      const schema: JSONSchema = { type: "boolean" };
      expect(getFieldType(schema)).toBe("boolean");
    });

    it("should detect select for enum", () => {
      const schema: JSONSchema = { type: "string", enum: ["a", "b", "c"] };
      expect(getFieldType(schema)).toBe("select");
    });

    it("should detect array field", () => {
      const schema: JSONSchema = { type: "array", items: { type: "string" } };
      expect(getFieldType(schema)).toBe("array");
    });
  });

  describe("Form value merging", () => {
    const mergeValues = (
      defaultValues: Record<string, unknown>,
      formValues: Record<string, unknown>
    ): Record<string, unknown> => {
      return { ...defaultValues, ...formValues };
    };

    it("should use default values", () => {
      const defaults = { name: "John", age: 25 };
      const result = mergeValues(defaults, {});
      expect(result).toEqual({ name: "John", age: 25 });
    });

    it("should override with form values", () => {
      const defaults = { name: "John", age: 25 };
      const form = { name: "Jane" };
      const result = mergeValues(defaults, form);
      expect(result).toEqual({ name: "Jane", age: 25 });
    });

    it("should add new form values", () => {
      const defaults = { name: "John" };
      const form = { age: 30 };
      const result = mergeValues(defaults, form);
      expect(result).toEqual({ name: "John", age: 30 });
    });
  });

  describe("Required field validation", () => {
    const isFieldRequired = (fieldName: string, required?: string[]): boolean => {
      return required?.includes(fieldName) ?? false;
    };

    it("should return true for required field", () => {
      expect(isFieldRequired("name", ["name", "email"])).toBe(true);
    });

    it("should return false for optional field", () => {
      expect(isFieldRequired("age", ["name", "email"])).toBe(false);
    });

    it("should return false when no required array", () => {
      expect(isFieldRequired("name", undefined)).toBe(false);
    });
  });

  describe("Schema title extraction", () => {
    const getFieldTitle = (fieldName: string, schema: JSONSchema): string => {
      if (schema.title) return schema.title;
      // Convert camelCase to Title Case
      return fieldName
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase())
        .trim();
    };

    it("should use schema title", () => {
      const schema: JSONSchema = { type: "string", title: "Full Name" };
      expect(getFieldTitle("name", schema)).toBe("Full Name");
    });

    it("should convert camelCase to title case", () => {
      const schema: JSONSchema = { type: "string" };
      expect(getFieldTitle("firstName", schema)).toBe("First Name");
    });

    it("should capitalize first letter", () => {
      const schema: JSONSchema = { type: "string" };
      expect(getFieldTitle("name", schema)).toBe("Name");
    });
  });

  describe("Number validation", () => {
    const validateNumber = (
      value: number,
      schema: JSONSchema
    ): string | null => {
      if (schema.minimum !== undefined && value < schema.minimum) {
        return `Value must be at least ${schema.minimum}`;
      }
      if (schema.maximum !== undefined && value > schema.maximum) {
        return `Value must be at most ${schema.maximum}`;
      }
      if (schema.type === "integer" && !Number.isInteger(value)) {
        return "Value must be an integer";
      }
      return null;
    };

    it("should pass valid number", () => {
      const schema: JSONSchema = { type: "number", minimum: 0, maximum: 100 };
      expect(validateNumber(50, schema)).toBeNull();
    });

    it("should fail below minimum", () => {
      const schema: JSONSchema = { type: "number", minimum: 0 };
      expect(validateNumber(-5, schema)).toBe("Value must be at least 0");
    });

    it("should fail above maximum", () => {
      const schema: JSONSchema = { type: "number", maximum: 100 };
      expect(validateNumber(150, schema)).toBe("Value must be at most 100");
    });

    it("should fail non-integer for integer type", () => {
      const schema: JSONSchema = { type: "integer" };
      expect(validateNumber(3.5, schema)).toBe("Value must be an integer");
    });
  });
});
