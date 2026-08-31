const CHAT_COMPLETIONS_ENDPOINT = "/v1/chat/completions";

const EXTRACTION_SYSTEM_PROMPT =
  "You extract invoice fields from a pasted billing email. Reply with strict JSON only, " +
  "using the keys customer (string), amountCents (integer minor units), currency " +
  "(lowercase ISO 4217 code) and dueDate (ISO 8601 date, omit when absent). " +
  "Never add commentary or code fences.";

export type ExtractInvoiceInput = {
  text: string;
};

export type ExtractedInvoice = {
  customer: string;
  amountCents: number;
  currency: string;
  dueDate?: string;
};

export class OpenAIContractError extends Error {
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
    this.name = "OpenAIContractError";
    this.endpoint = endpoint;
    this.observedContractVersion = observedContractVersion;
    this.statusCode = statusCode;
  }
}

export class OpenAIConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenAIConfigError";
  }
}

class OpenAIGatewayError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "OpenAIGatewayError";
    this.statusCode = statusCode;
  }
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function observedVersion(response: Response) {
  return response.headers.get("X-Contract-Version") || "unknown";
}

function contractError(message: string, response: Response) {
  return new OpenAIContractError(
    message,
    CHAT_COMPLETIONS_ENDPOINT,
    observedVersion(response),
    response.status
  );
}

async function reportContractError(error: OpenAIContractError) {
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
    // Reporting is best effort and never affects invoice drafting.
  } finally {
    clearTimeout(timeout);
  }
}

function unsupportedParameterMessage(body: unknown) {
  if (
    !isRecord(body) ||
    !isRecord(body.error) ||
    body.error.code !== "unsupported_parameter"
  ) {
    return undefined;
  }
  return typeof body.error.message === "string"
    ? body.error.message
    : "OpenAI rejected an unsupported request parameter.";
}

function parseChatCompletion(body: unknown, response: Response): ExtractedInvoice {
  if (!isRecord(body) || !Array.isArray(body.choices) || body.choices.length === 0) {
    throw contractError("Chat completion response is missing the expected choices list.", response);
  }

  const choice = body.choices[0];
  if (
    !isRecord(choice) ||
    !isRecord(choice.message) ||
    typeof choice.message.content !== "string"
  ) {
    throw contractError("Chat completion choice is missing message content.", response);
  }

  let fields: unknown;
  try {
    fields = JSON.parse(choice.message.content);
  } catch {
    throw contractError("Chat completion content is not valid JSON.", response);
  }

  if (
    !isRecord(fields) ||
    typeof fields.customer !== "string" ||
    typeof fields.amountCents !== "number" ||
    typeof fields.currency !== "string"
  ) {
    throw contractError("Extracted invoice is missing required fields.", response);
  }

  const invoice: ExtractedInvoice = {
    customer: fields.customer,
    amountCents: fields.amountCents,
    currency: fields.currency
  };
  if (typeof fields.dueDate === "string") {
    invoice.dueDate = fields.dueDate;
  }
  return invoice;
}

export async function extractInvoiceFields(
  input: ExtractInvoiceInput
): Promise<ExtractedInvoice> {
  const gatewayUrl = process.env.OPENAI_GATEWAY_URL;
  if (!gatewayUrl) {
    throw new OpenAIConfigError("OpenAI extraction gateway is not configured.");
  }

  const payload = JSON.stringify({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
      { role: "user", content: input.text }
    ],
    max_tokens: 256,
    temperature: 0
  });
  const response = await fetch(`${gatewayUrl.replace(/\/$/, "")}${CHAT_COMPLETIONS_ENDPOINT}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload
  });
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new OpenAIGatewayError("OpenAI gateway returned invalid JSON.", response.status);
  }

  if (!response.ok) {
    const rejectedParameter = unsupportedParameterMessage(body);
    if (response.status === 400 && rejectedParameter) {
      const error = contractError(rejectedParameter, response);
      void reportContractError(error);
      throw error;
    }
    throw new OpenAIGatewayError("OpenAI gateway rejected the extraction.", response.status);
  }

  try {
    return parseChatCompletion(body, response);
  } catch (error) {
    if (error instanceof OpenAIContractError) {
      void reportContractError(error);
    }
    throw error;
  }
}
