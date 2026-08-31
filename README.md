# InvoicePilot

InvoicePilot is a small demo billing SaaS for keeping customer invoices and payment collection in one focused workspace. It includes a seeded invoice list, Stripe-powered demo collection, OpenAI-powered invoice drafting from pasted email text, CSV export, and a public feedback board.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Test and build

```bash
npm test
npm run lint
npm run build
```

## Environment variables

Copy `.env.example` to `.env.local` and set:

- `STRIPE_GATEWAY_URL` — the demo gateway base URL, such as `https://<deployment>.convex.site/demo/stripe`.
- `OPENAI_GATEWAY_URL` — the demo chat-completions gateway base URL, such as `https://<deployment>.convex.site/demo/openai`.
- `SENTINEL_INGEST_URL` — Sentinel's error ingestion URL.
- `SENTINEL_INGEST_TOKEN` — bearer token for Sentinel ingestion.
- `SENTINEL_PRODUCT_ID` — InvoicePilot's Sentinel product identifier.
- `SENTINEL_INTEGRATION_ID` — the identifier of the integration that reported the incident.

InvoicePilot never stores a vendor secret key. Each vendor integration is isolated in its own adapter — `src/lib/stripe.ts` and `src/lib/openai.ts` — and goes through the configured demo gateway.

## Demo data

Invoices and feedback posts use an in-memory demo store. Data resets when a deployment instance restarts or is replaced; this app does not include a database.
InvoicePilot — demo billing SaaS (Devin repair target)
