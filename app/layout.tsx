import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "InvoicePilot | Billing, on autopilot",
  description: "A focused demo billing workspace for modern teams."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <header className="topbar">
            <Link className="brand" href="/">
              <span className="brand-mark" aria-hidden="true">
                ↗
              </span>
              <span>InvoicePilot</span>
            </Link>
            <nav className="nav-links" aria-label="Main navigation">
              <Link href="/">Invoices</Link>
              <Link href="/feedback">Feedback</Link>
            </nav>
            <span className="workspace-pill">
              <span className="status-dot" aria-hidden="true" />
              Demo workspace
            </span>
          </header>
          {children}
          <footer className="footer">
            <span>InvoicePilot</span>
            <span>Billing, on autopilot.</span>
          </footer>
        </div>
      </body>
    </html>
  );
}
