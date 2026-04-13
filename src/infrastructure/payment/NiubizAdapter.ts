import type {
  IPaymentProvider,
  PaymentSession,
  PaymentResult,
  AuthorizeTransactionInput,
} from "@/core/domain/ports/IPaymentProvider";

const NIUBIZ_MERCHANT_ID = process.env.NIUBIZ_MERCHANT_ID!;
const NIUBIZ_API_USERNAME = process.env.NIUBIZ_API_USERNAME!;
const NIUBIZ_API_PASS = process.env.NIUBIZ_API_PASS!;
const NIUBIZ_SECURITY_URL = process.env.NIUBIZ_SECURITY_URL!;
const NIUBIZ_SESSION_URL = process.env.NIUBIZ_SESSION_URL!;

export class NiubizAdapter implements IPaymentProvider {
  /** Step 1: Get security token via Basic Auth */
  private async getSecurityToken(): Promise<string> {
    const credentials = Buffer.from(
      `${NIUBIZ_API_USERNAME}:${NIUBIZ_API_PASS}`
    ).toString("base64");

    const response = await fetch(NIUBIZ_SECURITY_URL, {
      method: "POST",
      headers: { Authorization: `Basic ${credentials}` },
    });

    if (!response.ok) {
      throw new Error(`Niubiz security token failed: ${response.status}`);
    }

    return (await response.text()).trim();
  }

  /** Step 2: Create session token for Lightbox */
  private async getSessionToken(
    securityToken: string,
    amount: number,
    orderId: string
  ): Promise<string> {
    const response = await fetch(
      `${NIUBIZ_SESSION_URL}/${NIUBIZ_MERCHANT_ID}`,
      {
        method: "POST",
        headers: {
          Authorization: securityToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: "web",
          amount: amount.toFixed(2),
          antifraud: {
            clientIp: "127.0.0.1",
            merchantDefineData: {
              MDD4: "integraciones@niubiz.com.pe",
              MDD32: "123456789",
              MDD75: "Invitado",
              MDD77: 0,
            },
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Niubiz session token failed: ${response.status}`);
    }

    const data = await response.json();
    return data.sessionKey;
  }

  async createSession(
    amount: number,
    orderId: string
  ): Promise<PaymentSession> {
    const securityToken = await this.getSecurityToken();
    const sessionToken = await this.getSessionToken(
      securityToken,
      amount,
      orderId
    );

    return {
      sessionToken,
      merchantId: NIUBIZ_MERCHANT_ID,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    };
  }

  /** Step 4: Authorize the transaction (POST) */
  async authorizeTransaction(
    input: AuthorizeTransactionInput
  ): Promise<PaymentResult> {
    const securityToken = await this.getSecurityToken();

    const baseUrl = new URL(NIUBIZ_SECURITY_URL);
    const authorizationUrl = `${baseUrl.origin}/api.authorization/v3/authorization/ecommerce/${input.merchantId}`;

    const body = {
      channel: "web",
      captureType: "manual",
      countable: true,
      order: {
        tokenId: input.transactionToken,
        purchaseNumber: input.purchaseNumber,
        amount: Number(input.amount.toFixed(2)),
        currency: input.currency ?? "PEN",
      },
    };

    console.log("[Niubiz] POST", authorizationUrl);
    console.log("[Niubiz] Body:", JSON.stringify(body, null, 2));

    const response = await fetch(authorizationUrl, {
      method: "POST",
      headers: {
        Authorization: securityToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    console.log("[Niubiz] Response status:", response.status);
    console.log("[Niubiz] Response body:", responseText);

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(responseText);
    } catch {
      return {
        success: false,
        errorMessage: `Authorization failed: ${response.status} — ${responseText.slice(0, 200)}`,
      };
    }

    if (!response.ok) {
      const errMsg =
        (data as { errorMessage?: string }).errorMessage ??
        (data as { description?: string }).description ??
        `Authorization failed: ${response.status}`;
      console.error("[Niubiz] Authorization error:", errMsg);
      return {
        success: false,
        errorMessage: errMsg,
        rawResponse: data,
      };
    }

    const actionCode = (data as { dataMap?: { ACTION_CODE?: string } })?.dataMap?.ACTION_CODE;
    const txnId = (data as { dataMap?: { TRANSACTION_ID?: string } })?.dataMap?.TRANSACTION_ID;

    return {
      success: actionCode === "000",
      transactionId: txnId ?? input.transactionToken,
      errorMessage:
        actionCode !== "000"
          ? (data as { dataMap?: { ACTION_DESCRIPTION?: string } })?.dataMap?.ACTION_DESCRIPTION ?? `Action code: ${actionCode}`
          : undefined,
      rawResponse: data,
    };
  }
}
