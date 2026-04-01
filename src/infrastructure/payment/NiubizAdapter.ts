import type {
  IPaymentProvider,
  PaymentSession,
  PaymentResult,
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

  async verifyTransaction(
    transactionId: string,
    merchantId: string
  ): Promise<PaymentResult> {
    const securityToken = await this.getSecurityToken();

    const response = await fetch(
      `${NIUBIZ_SESSION_URL.replace("token/session", "configuration/transaction")}/${merchantId}/${transactionId}`,
      {
        method: "GET",
        headers: {
          Authorization: securityToken,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      return {
        success: false,
        errorMessage: `Verification failed: ${response.status}`,
      };
    }

    const data = await response.json();
    const actionCode = data?.dataMap?.ACTION_CODE;

    return {
      success: actionCode === "000",
      transactionId: data?.dataMap?.TRANSACTION_ID ?? transactionId,
      errorMessage: actionCode !== "000" ? `Action code: ${actionCode}` : undefined,
      rawResponse: data,
    };
  }
}
