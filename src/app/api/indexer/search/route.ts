import { NextRequest, NextResponse } from "next/server";
import { indexer } from "@/lib/indexer";
import type { SearchQuery } from "@/types/indexer";

export async function POST(request: NextRequest) {
  try {
    const query: SearchQuery = await request.json();

    const result = await indexer.search(query);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { message: "Search failed" },
      { status: 500 }
    );
  }
}
