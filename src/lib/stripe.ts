const PAYMENT_INTENTS_ENDPOINT = "/v1/payment_intents";

export type CollectPaymentInput = {
  amountCents: number;
  currency: string;
};

export type CollectPaymentResult = {
  paymentIntentId: string;
  status: string;
  chargeId: string;
  receiptUrl?: string;
};

export class StripeContractError extends Error {
  readonly endpoint: string;
  readonly observedContractVersion: string;
  readonly statusCode?: number;

  constructor(
    message: string,
    endpoint: string,
    observedContractVersion: string,
    statusCode?: number
  ) {
    super(message);
    this.name = "StripeContractError";
    this.endpoint = endpoint;
    this.observedContractVersion = observedContractVersion;
    this.statusCode = statusCode;
  }
}

export class StripeConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StripeConfigError";
  }
}

class StripeGatewayError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "StripeGatewayError";
    this.statusCode = statusCode;
  }
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function observedVersion(response: Response, body: unknown) {
  const headerVersion = response.headers.get("Stripe-Version");
  if (headerVersion) {
    return headerVersion;
  }
  if (isRecord(body)) {
    const bodyVersion = body.stripe_version ?? body.api_version;
    if (typeof bodyVersion === "string" && bodyVersion) {
      return bodyVersion;
    }
  }
  return "unknown";
}

function contractError(message: string, response: Response, body: unknown) {
  return new StripeContractError(
    message,
    PAYMENT_INTENTS_ENDPOINT,
    observedVersion(response, body),
    response.status
  );
}

async function reportContractError(error: StripeContractError) {
  const url = process.env.SENTINEL_INGEST_URL;
  const token = process.env.SENTINEL_INGEST_TOKEN;
  const productId = process.env.SENTINEL_PRODUCT_ID;
  const integrationId = process.env.SENTINEL_INTEGRATION_ID;
  if (!url || !token || !productId || !integrationId) {
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        productId,
        integrationId,
        endpoint: error.endpoint,
        message: error.message,
        statusCode: error.statusCode,
        contractVersion: error.observedContractVersion
      }),
      signal: controller.signal
    });
  } catch {
    // Reporting is best effort and never affects payment handling.
  } finally {
    clearTimeout(timeout);
  }
}

function parsePaymentIntent(body: unknown, response: Response): CollectPaymentResult {
  if (!isRecord(body) || typeof body.id !== "string" || typeof body.status !== "string") {
    throw contractError("PaymentIntent response is missing required fields.", response, body);
  }

  const latestCharge = body.latest_charge;

  if (typeof latestCharge === "string" && latestCharge) {
    return {
      paymentIntentId: body.id,
      status: body.status,
      chargeId: latestCharge
    };
  }

  if (isRecord(latestCharge) && typeof latestCharge.id === "string") {
    return {
      paymentIntentId: body.id,
      status: body.status,
      chargeId: latestCharge.id,
      receiptUrl:
        typeof latestCharge.receipt_url === "string" ? latestCharge.receipt_url : undefined
    };
  }

  throw contractError("PaymentIntent response is missing latest_charge.", response, body);
}

export async function collectPayment(
  input: CollectPaymentInput
): Promise<CollectPaymentResult> {
  const gatewayUrl = process.env.STRIPE_GATEWAY_URL;
  if (!gatewayUrl) {
    throw new StripeConfigError("Stripe payment gateway is not configured.");
  }

  const form = new URLSearchParams({
    amount: String(input.amountCents),
    currency: input.currency.toLowerCase(),
    confirm: "true",
    payment_method: "pm_card_visa",
    "expand[]": "latest_charge"
  });
  const response = await fetch(`${gatewayUrl.replace(/\/$/, "")}${PAYMENT_INTENTS_ENDPOINT}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString()
  });
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new StripeGatewayError("Stripe gateway returned invalid JSON.", response.status);
  }

  if (!response.ok) {
    throw new StripeGatewayError("Stripe gateway rejected the payment.", response.status);
  }

  try {
    return parsePaymentIntent(body, response);
  } catch (error) {
    if (error instanceof StripeContractError) {
      void reportContractError(error);
    }
    throw error;
  }
}
