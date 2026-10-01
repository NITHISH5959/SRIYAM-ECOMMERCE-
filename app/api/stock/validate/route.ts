import { NextRequest, NextResponse } from "next/server";
import { validateCartStock } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items = body?.items;

    if (!Array.isArray(items)) {
      return NextResponse.json(
        { valid: false, errors: [{ message: "Invalid request format" }] },
        { status: 400 }
      );
    }

    const result = await validateCartStock(items);

    return NextResponse.json(result, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    });
  } catch (err: any) {
    console.error("[stock/validate] Error validating stock:", err);
    return NextResponse.json(
      { valid: false, errors: [{ message: err.message || "Failed to validate stock" }] },
      { status: 500 }
    );
  }
}
