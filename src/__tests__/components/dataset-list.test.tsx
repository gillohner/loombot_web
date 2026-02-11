import { describe, it, expect } from "vitest";
import type { Dataset } from "@/types/dataset";

// Pure logic tests for dataset list functionality
// Testing the logic without rendering React components

describe("DatasetList Logic", () => {
  const mockDatasets: Dataset[] = [
    {
      id: "dataset1",
      name: "Cities",
      description: "List of major cities",
      data: [
        { name: "New York", country: "USA" },
        { name: "London", country: "UK" },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "dataset2",
      name: "Categories",
      description: "Product categories",
      data: { electronics: true, clothing: true },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  describe("Data type detection", () => {
    const getDataType = (data: unknown): "array" | "object" | "primitive" => {
      if (Array.isArray(data)) return "array";
      if (data !== null && typeof data === "object") return "object";
      return "primitive";
    };

    it("should detect array", () => {
      expect(getDataType([1, 2, 3])).toBe("array");
    });

    it("should detect object", () => {
      expect(getDataType({ key: "value" })).toBe("object");
    });

    it("should detect primitive", () => {
      expect(getDataType("string")).toBe("primitive");
      expect(getDataType(123)).toBe("primitive");
      expect(getDataType(null)).toBe("primitive");
    });
  });

  describe("Data size display", () => {
    const getDataSizeLabel = (data: unknown): string => {
      if (Array.isArray(data)) {
        const count = data.length;
        return count === 1 ? "1 item" : `${count} items`;
      }
      if (data !== null && typeof data === "object") {
        const keys = Object.keys(data);
        const count = keys.length;
        return count === 1 ? "1 key" : `${count} keys`;
      }
      return "primitive";
    };

    it("should show item count for arrays", () => {
      expect(getDataSizeLabel([1, 2, 3])).toBe("3 items");
    });

    it("should show singular for 1 item", () => {
      expect(getDataSizeLabel([1])).toBe("1 item");
    });

    it("should show key count for objects", () => {
      expect(getDataSizeLabel({ a: 1, b: 2 })).toBe("2 keys");
    });

    it("should show singular for 1 key", () => {
      expect(getDataSizeLabel({ a: 1 })).toBe("1 key");
    });
  });

  describe("Dataset filtering", () => {
    const filterDatasets = (datasets: Dataset[], search: string): Dataset[] => {
      if (!search) return datasets;
      const lower = search.toLowerCase();
      return datasets.filter(
        (d) =>
          d.name.toLowerCase().includes(lower) ||
          d.description?.toLowerCase().includes(lower)
      );
    };

    it("should filter by name", () => {
      const result = filterDatasets(mockDatasets, "cities");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Cities");
    });

    it("should filter by description", () => {
      const result = filterDatasets(mockDatasets, "product");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Categories");
    });

    it("should return all when no search", () => {
      const result = filterDatasets(mockDatasets, "");
      expect(result).toHaveLength(2);
    });
  });

  describe("URI generation", () => {
    const generateDatasetUri = (publicKey: string, datasetId: string): string => {
      return `pubky://${publicKey}/pub/bot_builder/datasets/${datasetId}`;
    };

    it("should generate valid URI", () => {
      const uri = generateDatasetUri("pk:user123", "dataset1");
      expect(uri).toBe("pubky://pk:user123/pub/bot_builder/datasets/dataset1");
    });
  });

  describe("Data preview generation", () => {
    const generatePreview = (data: unknown, maxLength: number = 100): string => {
      const json = JSON.stringify(data, null, 2);
      if (json.length <= maxLength) return json;
      return json.slice(0, maxLength) + "...";
    };

    it("should return full JSON for small data", () => {
      const data = { a: 1 };
      const preview = generatePreview(data);
      expect(preview).toBe('{\n  "a": 1\n}');
    });

    it("should truncate large data", () => {
      const data = { key: "a".repeat(200) };
      const preview = generatePreview(data, 50);
      expect(preview.length).toBeLessThanOrEqual(53); // 50 + "..."
      expect(preview.endsWith("...")).toBe(true);
    });
  });

  describe("Empty state detection", () => {
    const shouldShowEmptyState = (
      datasets: Dataset[],
      isLoading: boolean
    ): boolean => {
      return !isLoading && datasets.length === 0;
    };

    it("should show empty when no datasets", () => {
      expect(shouldShowEmptyState([], false)).toBe(true);
    });

    it("should not show empty when loading", () => {
      expect(shouldShowEmptyState([], true)).toBe(false);
    });

    it("should not show empty when has datasets", () => {
      expect(shouldShowEmptyState(mockDatasets, false)).toBe(false);
    });
  });

  describe("Dataset sorting", () => {
    const sortDatasets = (
      datasets: Dataset[],
      sortBy: "name" | "updated"
    ): Dataset[] => {
      return [...datasets].sort((a, b) => {
        switch (sortBy) {
          case "name":
            return a.name.localeCompare(b.name);
          case "updated":
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          default:
            return 0;
        }
      });
    };

    it("should sort by name alphabetically", () => {
      const sorted = sortDatasets(mockDatasets, "name");
      expect(sorted[0].name).toBe("Categories");
      expect(sorted[1].name).toBe("Cities");
    });

    it("should not mutate original array", () => {
      const original = [...mockDatasets];
      sortDatasets(mockDatasets, "name");
      expect(mockDatasets).toEqual(original);
    });
  });

  describe("JSON validation", () => {
    const isValidJson = (str: string): boolean => {
      try {
        JSON.parse(str);
        return true;
      } catch {
        return false;
      }
    };

    it("should validate correct JSON", () => {
      expect(isValidJson('{"key": "value"}')).toBe(true);
    });

    it("should reject invalid JSON", () => {
      expect(isValidJson("not json")).toBe(false);
    });

    it("should validate arrays", () => {
      expect(isValidJson("[1, 2, 3]")).toBe(true);
    });
  });
});
