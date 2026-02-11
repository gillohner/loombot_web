import { NextRequest, NextResponse } from "next/server";
import { indexer } from "@/lib/indexer";

export async function POST(request: NextRequest) {
  try {
    const { publicKey } = await request.json();

    if (!publicKey || typeof publicKey !== "string") {
      return NextResponse.json(
        { message: "publicKey is required" },
        { status: 400 }
      );
    }

    await indexer.registerUser(publicKey);

    // Index the user's content in the background
    indexer.indexUser(publicKey).catch(console.error);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { message: "Registration failed" },
      { status: 500 }
    );
  }
}
