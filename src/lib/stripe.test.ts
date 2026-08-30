import { beforeEach, describe, expect, it, vi } from "vitest";
import legacyFixture from "./__fixtures__/payment_intent.2022-08-01.json";
import fixture from "./__fixtures__/payment_intent.2022-11-15.json";
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

  it("parses the 2022-11-15 PaymentIntent shape with latest_charge", async () => {
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
      chargeId: "ch_3OInvoicePilotDemo"
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

  it("reads receipt details from an expanded latest_charge", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ...fixture,
          latest_charge: {
            id: "ch_3OInvoicePilotDemo",
            object: "charge",
            status: "succeeded",
            receipt_url: "https://pay.stripe.com/receipts/demo-invoicepilot"
          }
        }),
        { status: 200, headers: { "Stripe-Version": "2022-11-15" } }
      )
    );

    await expect(collectPayment({ amountCents: 248000, currency: "usd" })).resolves.toEqual({
      paymentIntentId: "pi_3OInvoicePilotDemo",
      status: "succeeded",
      chargeId: "ch_3OInvoicePilotDemo",
      receiptUrl: "https://pay.stripe.com/receipts/demo-invoicepilot"
    });
  });

  it("still parses the legacy 2022-08-01 charges list", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(legacyFixture), {
        status: 200,
        headers: { "Stripe-Version": "2022-08-01" }
      })
    );

    await expect(collectPayment({ amountCents: 248000, currency: "usd" })).resolves.toEqual({
      paymentIntentId: "pi_3OInvoicePilotDemo",
      status: "succeeded",
      chargeId: "ch_3OInvoicePilotDemo",
      receiptUrl: "https://pay.stripe.com/receipts/demo-invoicepilot"
    });
  });

  it("raises a contract error when no charge is present", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ...fixture, latest_charge: null }), {
        status: 200,
        headers: { "Stripe-Version": "2022-11-15" }
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
