import { NextResponse } from "next/server";
import { indexer } from "@/lib/indexer";

export async function POST() {
  try {
    const result = await indexer.reindexAll();

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Reindex error:", error);
    return NextResponse.json(
      { message: "Reindex failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const stats = await indexer.getStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json(§
      { message: "Failed to get stats" },
      { status: 500 }
    );
  }
}
