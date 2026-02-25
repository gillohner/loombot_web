import { NextRequest, NextResponse } from "next/server";
import { parseGitUrl, getRawUrl } from "@/lib/services/service-loader";
import type { LoadedService } from "@/types/service-config";
import type { ServiceManifest } from "@/types/json-schema";

export async function POST(request: NextRequest) {
  try {
    const { gitUrl } = await request.json();

    if (!gitUrl || typeof gitUrl !== "string") {
      return NextResponse.json(
        { message: "gitUrl is required" },
        { status: 400 }
      );
    }

    const parsed = parseGitUrl(gitUrl);
    if (!parsed) {
      return NextResponse.json(
        { message: "Invalid git URL format" },
        { status: 400 }
      );
    }

    // Try to fetch the service files
    const constantsUrl = getRawUrl(gitUrl, "constants.ts");
    const serviceUrl = getRawUrl(gitUrl, "service.ts");
    const modUrl = getRawUrl(gitUrl, "mod.ts");

    let manifest: ServiceManifest | null = null;
    const errors: string[] = [];

    // Fetch both constants.ts and service.ts for complete manifest
    let constantsContent = "";
    let serviceContent = "";

    if (constantsUrl) {
      try {
        console.log("Fetching constants.ts from:", constantsUrl);
        const response = await fetch(constantsUrl);
        if (response.ok) {
          constantsContent = await response.text();
          console.log("constants.ts content length:", constantsContent.length);
        } else {
          errors.push(`constants.ts: HTTP ${response.status}`);
        }
      } catch (e) {
        console.error("Failed to fetch constants.ts:", e);
        errors.push(`constants.ts: ${e instanceof Error ? e.message : 'fetch failed'}`);
      }
    }

    if (serviceUrl) {
      try {
        console.log("Fetching service.ts from:", serviceUrl);
        const response = await fetch(serviceUrl);
        if (response.ok) {
          serviceContent = await response.text();
          console.log("service.ts content length:", serviceContent.length);
        } else {
          errors.push(`service.ts: HTTP ${response.status}`);
        }
      } catch (e) {
        console.error("Failed to fetch service.ts:", e);
        errors.push(`service.ts: ${e instanceof Error ? e.message : 'fetch failed'}`);
      }
    }

    // Try to parse combined content
    if (constantsContent || serviceContent) {
      const combined = constantsContent + "\n" + serviceContent;
      manifest = parseManifestFromSource(combined);
      if (manifest) {
        console.log("Successfully parsed manifest from combined files");
      }
    }

    // Fallback: try mod.ts
    if (!manifest && modUrl) {
      try {
        console.log("Fetching mod.ts from:", modUrl);
        const response = await fetch(modUrl);
        if (response.ok) {
          const content = await response.text();
          console.log("mod.ts content length:", content.length);
          manifest = parseManifestFromSource(content);
          if (manifest) {
            console.log("Successfully parsed manifest from mod.ts");
          }
        } else {
          errors.push(`mod.ts: HTTP ${response.status}`);
        }
      } catch (e) {
        console.error("Failed to fetch mod.ts:", e);
        errors.push(`mod.ts: ${e instanceof Error ? e.message : 'fetch failed'}`);
      }
    }

    if (!manifest) {
      return NextResponse.json(
        {
          message:
            `Could not parse service manifest. Tried:\n${errors.join('\n')}\n\nMake sure the URL points to a valid service with constants.ts, mod.ts, or service.ts containing serviceId and other required fields.`,
        },
        { status: 400 }
      );
    }

    const loadedService: LoadedService = {
      source: gitUrl,
      manifest,
    };

    return NextResponse.json(loadedService);
  } catch (error) {
    console.error("Error loading service:", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Failed to load service",
      },
      { status: 500 }
    );
  }
}

/**
 * Remove JS comments while respecting string boundaries.
 * Handles block comments, line comments, and avoids stripping :// inside strings.
 */
function removeComments(code: string): string {
  let result = "";
  let i = 0;
  while (i < code.length) {
    const ch = code[i];
    // Handle quoted strings (single or double)
    if (ch === '"' || ch === "'") {
      const quote = ch;
      result += code[i++];
      while (i < code.length && code[i] !== quote) {
        if (code[i] === "\\") {
          result += code[i++]; // escape char
        }
        if (i < code.length) result += code[i++];
      }
      if (i < code.length) result += code[i++]; // closing quote
    }
    // Handle block comments /* ... */
    else if (ch === "/" && i + 1 < code.length && code[i + 1] === "*") {
      i += 2;
      while (i + 1 < code.length && !(code[i] === "*" && code[i + 1] === "/")) {
        i++;
      }
      i += 2; // skip */
    }
    // Handle line comments // ...
    else if (ch === "/" && i + 1 < code.length && code[i + 1] === "/") {
      while (i < code.length && code[i] !== "\n") i++;
    }
    // Regular character
    else {
      result += code[i++];
    }
  }
  return result;
}

/**
 * Parse manifest information from TypeScript source
 * This is a simplified parser - in production you'd use a proper AST parser
 */
function parseManifestFromSource(source: string): ServiceManifest | null {
  try {
    // Build a map of constant values (strings)
    const constants: Record<string, string> = {};
    const constantMatches = source.matchAll(/export const (\w+)\s*=\s*["']([^"']+)["']/g);
    for (const match of constantMatches) {
      constants[match[1]] = match[2];
    }

    // Build a map of schema constants (objects) - first pass
    // Use brace counting to properly extract nested objects
    const schemaStrings: Record<string, string> = {};
    const schemaStartRegex = /export const (\w+(?:_SCHEMA|_SCHEMAS))[:\s]*(?:JSONSchema|DatasetSchemas)?\s*=\s*\{/g;

    let match;
    while ((match = schemaStartRegex.exec(source)) !== null) {
      const schemaName = match[1];
      const startIndex = match.index + match[0].length - 1; // Index of opening {

      // Count braces to find the matching closing brace
      let braceCount = 0;
      let endIndex = startIndex;
      let inString = false;
      let stringChar = '';
      let escaped = false;

      for (let i = startIndex; i < source.length; i++) {
        const char = source[i];

        // Handle escape sequences
        if (escaped) {
          escaped = false;
          continue;
        }
        if (char === '\\') {
          escaped = true;
          continue;
        }

        // Handle strings
        if ((char === '"' || char === "'") && !inString) {
          inString = true;
          stringChar = char;
          continue;
        }
        if (char === stringChar && inString) {
          inString = false;
          continue;
        }

        // Count braces only outside strings
        if (!inString) {
          if (char === '{') braceCount++;
          if (char === '}') braceCount--;

          if (braceCount === 0) {
            endIndex = i;
            break;
          }
        }
      }

      if (endIndex > startIndex) {
        schemaStrings[schemaName] = source.slice(startIndex, endIndex + 1);
      }
    }

    // Parse schemas (in dependency order - schemas without references first)
    const schemas: Record<string, unknown> = {};
    const parseSchema = (name: string, schemaStr: string): unknown => {
      if (schemas[name]) return schemas[name];

      // Remove comments while respecting string boundaries
      // (naive regex `.replace(/\/\/.*/g, "")` breaks URLs like pubky:// inside strings)
      let cleanedStr = removeComments(schemaStr);

      // Replace constant references with placeholder strings
      // Match only when the constant is used as a value (after : or [)
      for (const refName of Object.keys(schemaStrings)) {
        if (refName !== name) {
          const refRegex = new RegExp(`([:,\\[]\\s*)${refName}(\\s*[,}\\]])`, "g");
          cleanedStr = cleanedStr.replace(refRegex, `$1"__REF:${refName}"$2`);
        }
      }

      try {
        // Use Function constructor to safely evaluate the JavaScript object literal
        // This preserves strings, multiline content, and special characters correctly
        const func = new Function(`"use strict"; return (${cleanedStr});`);
        let parsed = func();

        // Resolve references
        const resolveRefs = (obj: unknown): unknown => {
          if (typeof obj === "string" && obj.startsWith("__REF:")) {
            const refName = obj.slice(6);
            if (schemaStrings[refName] && !schemas[refName]) {
              parseSchema(refName, schemaStrings[refName]);
            }
            return schemas[refName];
          }
          if (Array.isArray(obj)) {
            return obj.map(resolveRefs);
          }
          if (obj && typeof obj === "object") {
            const result: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(obj)) {
              result[key] = resolveRefs(value);
            }
            return result;
          }
          return obj;
        };

        parsed = resolveRefs(parsed);
        schemas[name] = parsed;
        return parsed;
      } catch (e) {
        console.warn(`Could not parse schema ${name}:`, e);
        return undefined;
      }
    };

    for (const [name, schemaStr] of Object.entries(schemaStrings)) {
      parseSchema(name, schemaStr);
    }

    console.log('Extracted schemas:', Object.keys(schemas));

    // Try to find defineService() call or object literal with service config
    let serviceId: string | undefined;
    let kind: "single_command" | "command_flow" | "listener" | undefined;
    let command: string | undefined;
    let description: string | undefined;

    // Method 1: Look for defineService({ id: ... })
    const defineServiceMatch = source.match(/defineService\s*\(\s*{([^}]+)}/);
    if (defineServiceMatch) {
      const serviceDefBlock = defineServiceMatch[1];

      // Extract id (may be a constant reference or string literal)
      const idMatch = serviceDefBlock.match(/id:\s*([A-Z_]+|["']([^"']+)["'])/);
      if (idMatch) {
        serviceId = idMatch[2] || constants[idMatch[1]];
      }

      // Extract kind (string literal or constant reference)
      const kindMatch = serviceDefBlock.match(/kind:\s*(?:["'](single_command|command_flow|listener)["']|([A-Z_]+))/);
      if (kindMatch) {
        const kindValue = kindMatch[1] || constants[kindMatch[2]];
        if (kindValue === "single_command" || kindValue === "command_flow" || kindValue === "listener") {
          kind = kindValue;
        }
      }

      // Extract command (string literal or constant reference)
      const commandMatch = serviceDefBlock.match(/command:\s*(?:["']([^"']+)["']|([A-Z_]+))/);
      if (commandMatch) {
        command = commandMatch[1] || constants[commandMatch[2]];
      }

      // Extract description
      const descriptionMatch = serviceDefBlock.match(/description:\s*["']([^"']+)["']/);
      description = descriptionMatch?.[1];
    } else {
      // Method 2: Legacy format with serviceId:
      const serviceIdMatch = source.match(/serviceId:\s*["']([^"']+)["']/);
      serviceId = serviceIdMatch?.[1];

      const kindMatch = source.match(/kind:\s*["'](single_command|command_flow|listener)["']/);
      kind = kindMatch?.[1] as typeof kind;

      const commandMatch = source.match(/command:\s*["']([^"']+)["']/);
      command = commandMatch?.[1];

      const descriptionMatch = source.match(/description:\s*["']([^"']+)["']/);
      description = descriptionMatch?.[1];
    }

    if (!serviceId) {
      console.warn("Could not extract serviceId from source");
      return null;
    }

    // Get configSchema from schemas map
    let configSchema: ServiceManifest["configSchema"] = undefined;
    const configSchemaKey = Object.keys(schemas).find(
      (k) => k.endsWith("CONFIG_SCHEMA") && !k.includes("DATASET")
    );
    if (configSchemaKey) {
      configSchema = schemas[configSchemaKey] as ServiceManifest["configSchema"];
      console.log('Found config schema:', configSchemaKey);
    } else {
      console.log('No config schema found. Available schemas:', Object.keys(schemas));
    }

    // Get datasetSchemas from schemas map (references already resolved)
    let datasetSchemas: ServiceManifest["datasetSchemas"] = undefined;
    const datasetSchemasKey = Object.keys(schemas).find((k) =>
      k.endsWith("DATASET_SCHEMAS")
    );
    if (datasetSchemasKey) {
      datasetSchemas = schemas[datasetSchemasKey] as ServiceManifest["datasetSchemas"];
      console.log('Found dataset schemas:', datasetSchemasKey, datasetSchemas);
    }

    return {
      serviceId,
      kind: kind || "single_command",
      command,
      description,
      configSchema,
      datasetSchemas,
    };
  } catch (error) {
    console.error("Error parsing manifest:", error);
    return null;
  }
}
