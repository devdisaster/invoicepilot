import { NextResponse } from "next/server";
import { getInvoice, markInvoicePaid } from "@/src/lib/invoices";
import { collectPayment } from "@/src/lib/stripe";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const invoice = getInvoice(params.id);
  if (!invoice || invoice.status !== "open") {
    return NextResponse.json({ error: "Invoice is not available for payment." }, { status: 404 });
  }

  try {
    const payment = await collectPayment({
      amountCents: invoice.amountCents,
      currency: invoice.currency
    });
    const updatedInvoice = markInvoicePaid(invoice.id, payment.receiptUrl);
    return NextResponse.json({ invoice: updatedInvoice });
  } catch {
    return NextResponse.json(
      { error: "Payment processing is temporarily unavailable. Please try again later." },
      { status: 502 }
    );
  }
}
