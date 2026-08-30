import Link from "next/link";
import { getInvoices, type Invoice } from "@/src/lib/invoices";
import InvoiceActions from "./invoice-actions";

export const dynamic = "force-dynamic";

function formatAmount(invoice: Invoice) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: invoice.currency.toUpperCase()
  }).format(invoice.amountCents / 100);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${date}T12:00:00`));
}

function statusLabel(status: Invoice["status"]) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function InvoicesPage() {
  const invoices = getInvoices();
  const totalOutstanding = invoices
    .filter((invoice) => invoice.status === "open")
    .reduce((total, invoice) => total + invoice.amountCents, 0);
  const paidThisMonth = invoices
    .filter((invoice) => invoice.status === "paid")
    .reduce((total, invoice) => total + invoice.amountCents, 0);

  return (
    <main className="page-container">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Workspace overview</p>
          <h1>Invoices</h1>
          <p className="page-subtitle">
            Keep every payment moving with a clear view of your billing.
          </p>
        </div>
        <a className="button button-secondary" href="/api/invoices/export">
          <span aria-hidden="true">↓</span> Export CSV
        </a>
      </section>

      <section className="metric-grid" aria-label="Invoice summary">
        <div className="metric-card">
          <span className="metric-label">Total invoices</span>
          <strong>{invoices.length}</strong>
          <span className="metric-note positive">↑ 12% <em>vs last month</em></span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Outstanding</span>
          <strong>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(totalOutstanding / 100)}</strong>
          <span className="metric-note">Across {invoices.filter((invoice) => invoice.status === "open").length} open invoices</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Paid this month</span>
          <strong>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(paidThisMonth / 100)}</strong>
          <span className="metric-note positive">On track</span>
        </div>
      </section>

      <section className="content-card">
        <div className="content-card-header">
          <div>
            <h2>Recent invoices</h2>
            <p>Track payment status across your customer accounts.</p>
          </div>
          <span className="count-pill">{invoices.length} invoices</span>
        </div>
        <div className="invoice-table-wrap">
          <table className="invoice-table">
            <thead>
              <tr>
                <th scope="col">Invoice</th>
                <th scope="col">Customer</th>
                <th scope="col">Created</th>
                <th scope="col">Amount</th>
                <th scope="col">Status</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td><span className="invoice-id">{invoice.id}</span></td>
                  <td>
                    <div className="customer-cell">
                      <span className="avatar" aria-hidden="true">{invoice.customer.charAt(0)}</span>
                      <span>{invoice.customer}</span>
                    </div>
                  </td>
                  <td className="muted-cell">{formatDate(invoice.createdDate)}</td>
                  <td className="amount-cell">{formatAmount(invoice)}</td>
                  <td><span className={`status status-${invoice.status}`}><span aria-hidden="true" />{statusLabel(invoice.status)}</span></td>
                  <td><InvoiceActions invoice={invoice} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bottom-callout">
        <div>
          <span className="callout-icon" aria-hidden="true">✦</span>
          <div>
            <h2>Need a hand?</h2>
            <p>Tell us what would make billing easier for your team.</p>
          </div>
        </div>
        <Link className="text-link" href="/feedback">Share feedback <span aria-hidden="true">→</span></Link>
      </section>
    </main>
  );
}
