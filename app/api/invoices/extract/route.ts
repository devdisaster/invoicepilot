import { NextResponse } from "next/server";
import { extractInvoiceFields } from "@/src/lib/openai";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { text?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "Paste invoice text to extract." }, { status: 400 });
  }

  try {
    const draft = await extractInvoiceFields({ text });
    return NextResponse.json({ draft });
  } catch {
    return NextResponse.json(
      { error: "Invoice extraction is temporarily unavailable. Please try again later." },
      { status: 502 }
    );
  }
}
