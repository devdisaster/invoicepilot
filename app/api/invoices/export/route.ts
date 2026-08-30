import { getInvoices } from "@/src/lib/invoices";

function escapeCsv(value: string | number) {
  const stringValue = String(value);
  return /[",\n]/.test(stringValue)
    ? `"${stringValue.replaceAll('"', '""')}"`
    : stringValue;
}

export function GET() {
  const rows = getInvoices().map((invoice) =>
    [
      invoice.id,
      invoice.customer,
      invoice.amountCents / 100,
      invoice.currency.toUpperCase(),
      invoice.status,
      invoice.createdDate
    ].map(escapeCsv).join(",")
  );

  return new Response(`${rows.join("\n")}\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="invoicepilot-invoices.csv"'
    }
  });
}
