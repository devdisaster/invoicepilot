export type InvoiceStatus = "draft" | "open" | "paid";

export type Invoice = {
  id: string;
  customer: string;
  amountCents: number;
  currency: string;
  status: InvoiceStatus;
  createdDate: string;
  receiptUrl?: string;
};

const invoices: Invoice[] = [
  { id: "INV-1042", customer: "Northstar Labs", amountCents: 248000, currency: "usd", status: "open", createdDate: "2024-07-28" },
  { id: "INV-1041", customer: "Juniper & Co.", amountCents: 87500, currency: "usd", status: "paid", createdDate: "2024-07-26", receiptUrl: "https://pay.stripe.com/receipts/demo-inv-1041" },
  { id: "INV-1040", customer: "Helio Systems", amountCents: 142500, currency: "usd", status: "open", createdDate: "2024-07-22" },
  { id: "INV-1039", customer: "Cedar House", amountCents: 64000, currency: "usd", status: "draft", createdDate: "2024-07-18" },
  { id: "INV-1038", customer: "Morrow Studio", amountCents: 319000, currency: "usd", status: "paid", createdDate: "2024-07-11", receiptUrl: "https://pay.stripe.com/receipts/demo-inv-1038" },
  { id: "INV-1037", customer: "Pine & Pixel", amountCents: 52500, currency: "eur", status: "paid", createdDate: "2024-07-03", receiptUrl: "https://pay.stripe.com/receipts/demo-invoicepilot" }
];

export function getInvoices() {
  return invoices.map((invoice) => ({ ...invoice }));
}

export function getInvoice(id: string) {
  const invoice = invoices.find((item) => item.id === id);
  return invoice ? { ...invoice } : undefined;
}

export function markInvoicePaid(id: string, receiptUrl?: string) {
  const invoice = invoices.find((item) => item.id === id);
  if (!invoice) {
    return undefined;
  }
  invoice.status = "paid";
  if (receiptUrl) {
    invoice.receiptUrl = receiptUrl;
  }
  return { ...invoice };
}
