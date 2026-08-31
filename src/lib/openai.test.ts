import { beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "./__fixtures__/chat_completion.2024-09-12.json";
import { extractInvoiceFields, OpenAIConfigError, OpenAIContractError } from "./openai";

const PASTED_EMAIL =
  "Hi — please invoice Northstar Labs $2,480.00 USD for the August retainer, due 2026-09-30.";

const UNSUPPORTED_PARAMETER = {
  error: {
    message:
      "Unsupported parameter: 'max_tokens' is not supported with this model. Use 'max_completion_tokens' instead.",
    type: "invalid_request_error",
    param: "max_tokens",
    code: "unsupported_parameter"
  }
};

describe("extractInvoiceFields", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.OPENAI_GATEWAY_URL = "https://gateway.example/demo/openai";
    delete process.env.SENTINEL_INGEST_URL;
    delete process.env.SENTINEL_INGEST_TOKEN;
    delete process.env.SENTINEL_PRODUCT_ID;
    delete process.env.SENTINEL_INTEGRATION_ID;
  });

  it("parses the 2024-09-12 chat.completion shape and sends max_completion_tokens", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(fixture), {
        status: 200,
        headers: { "X-Contract-Version": "2024-09-12" }
      })
    );

    const result = await extractInvoiceFields({ text: PASTED_EMAIL });

    expect(result).toEqual({
      customer: "Northstar Labs",
      amountCents: 248000,
      currency: "usd",
      dueDate: "2026-09-30"
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://gateway.example/demo/openai/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"max_completion_tokens":256')
      })
    );
    const sentBody = JSON.parse(
      (fetchMock.mock.calls[0][1] as RequestInit).body as string
    );
    expect(sentBody).not.toHaveProperty("max_tokens");
  });

  it("raises a configuration error when the gateway is unset", async () => {
    delete process.env.OPENAI_GATEWAY_URL;

    await expect(
      extractInvoiceFields({ text: PASTED_EMAIL })
    ).rejects.toBeInstanceOf(OpenAIConfigError);
  });

  it("reports and raises a contract error when the gateway rejects max_tokens", async () => {
    process.env.SENTINEL_INGEST_URL = "https://sentinel.example/ingest/errors";
    process.env.SENTINEL_INGEST_TOKEN = "test-token";
    process.env.SENTINEL_PRODUCT_ID = "prod_invoicepilot";
    process.env.SENTINEL_INTEGRATION_ID = "int_openai";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(UNSUPPORTED_PARAMETER), {
        status: 400,
        headers: { "X-Contract-Version": "2024-09-12" }
      })
    );

    const failure = await extractInvoiceFields({ text: PASTED_EMAIL }).catch(
      (error: unknown) => error
    );

    expect(failure).toBeInstanceOf(OpenAIContractError);
    expect(failure).toMatchObject({
      endpoint: "/v1/chat/completions",
      statusCode: 400,
      observedContractVersion: "2024-09-12"
    });
    expect((failure as OpenAIContractError).message).toContain("max_completion_tokens");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://sentinel.example/ingest/errors",
      expect.objectContaining({ method: "POST" })
    );
  });
});
