import { beforeEach, describe, expect, it, vi } from "vitest";
import legacyFixture from "./__fixtures__/payment_intent.2022-08-01.json";
import fixture from "./__fixtures__/payment_intent.2022-11-15.json";
import expandedFixture from "./__fixtures__/payment_intent.2022-11-15.expanded.json";
import { collectPayment, StripeConfigError, StripeContractError } from "./stripe";

describe("collectPayment", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.STRIPE_GATEWAY_URL = "https://gateway.example/demo/stripe";
    delete process.env.SENTINEL_INGEST_URL;
    delete process.env.SENTINEL_INGEST_TOKEN;
    delete process.env.SENTINEL_PRODUCT_ID;
    delete process.env.SENTINEL_INTEGRATION_ID;
  });

  it("parses the 2022-11-15 PaymentIntent shape with latest_charge as an id", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(fixture), {
        status: 200,
        headers: { "Stripe-Version": "2022-11-15" }
      })
    );

    const result = await collectPayment({ amountCents: 248000, currency: "usd" });

    expect(result).toEqual({
      paymentIntentId: "pi_3OInvoicePilotDemo",
      status: "succeeded",
      receiptUrl: "https://pay.stripe.com/receipts/ch_3OInvoicePilotDemo"
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://gateway.example/demo/stripe/v1/payment_intents",
      expect.objectContaining({
        method: "POST",
        body:
          "amount=248000&currency=usd&confirm=true&payment_method=pm_card_visa&expand%5B%5D=latest_charge"
      })
    );
  });

  it("uses receipt_url when latest_charge is expanded", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(expandedFixture), {
        status: 200,
        headers: { "Stripe-Version": "2022-11-15" }
      })
    );

    const result = await collectPayment({ amountCents: 248000, currency: "usd" });

    expect(result).toEqual({
      paymentIntentId: "pi_3OInvoicePilotDemo",
      status: "succeeded",
      receiptUrl: "https://pay.stripe.com/receipts/demo-invoicepilot"
    });
  });

  it("raises a contract error when latest_charge is absent", async () => {
    const { latest_charge: _omitted, ...withoutLatestCharge } = fixture as Record<string, unknown>;
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(withoutLatestCharge), {
        status: 200,
        headers: { "Stripe-Version": "2022-11-15" }
      })
    );

    await expect(
      collectPayment({ amountCents: 248000, currency: "usd" })
    ).rejects.toBeInstanceOf(StripeContractError);
  });

  it("still reports a contract error for the removed charges-only shape", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(legacyFixture), {
        status: 200,
        headers: { "Stripe-Version": "2022-08-01" }
      })
    );

    await expect(
      collectPayment({ amountCents: 248000, currency: "usd" })
    ).rejects.toBeInstanceOf(StripeContractError);
  });

  it("raises a configuration error when the gateway is unset", async () => {
    delete process.env.STRIPE_GATEWAY_URL;

    await expect(
      collectPayment({ amountCents: 1000, currency: "usd" })
    ).rejects.toBeInstanceOf(StripeConfigError);
  });
});
