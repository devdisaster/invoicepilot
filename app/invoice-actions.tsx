"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Invoice } from "@/src/lib/invoices";

export default function InvoiceActions({ invoice }: { invoice: Invoice }) {
  const router = useRouter();
  const [isCollecting, setIsCollecting] = useState(false);
  const [error, setError] = useState("");

  async function collectPayment() {
    setIsCollecting(true);
    setError("");
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/collect`, { method: "POST" });
      if (!response.ok) {
        setError("Payment processing is temporarily unavailable. Please try again later.");
        return;
      }
      router.refresh();
    } catch {
      setError("Payment processing is temporarily unavailable. Please try again later.");
    } finally {
      setIsCollecting(false);
    }
  }

  if (error) {
    return <span className="inline-error" role="alert">{error}</span>;
  }

  if (invoice.receiptUrl) {
    return <a className="receipt-link" href={invoice.receiptUrl} target="_blank" rel="noreferrer">Receipt ↗</a>;
  }

  if (invoice.status !== "open") {
    return <span className="action-muted">—</span>;
  }

  return (
    <button className="button button-small" onClick={collectPayment} disabled={isCollecting}>
      {isCollecting ? "Processing…" : "Collect payment"}
    </button>
  );
}
