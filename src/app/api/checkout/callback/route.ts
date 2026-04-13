import { NextResponse } from "next/server";

/**
 * Niubiz Lightbox POSTs form data to the `action` URL after payment.
 * This route extracts the transactionToken and redirects back to the
 * checkout page with it as a query param so the client can verify.
 */
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const transactionToken = formData.get("transactionToken") as string | null;

    const url = new URL("/checkout", req.url);
    url.searchParams.set("status", "callback");
    if (transactionToken) {
      url.searchParams.set("transactionToken", transactionToken);
    }

    return NextResponse.redirect(url.toString(), 303);
  } catch {
    return NextResponse.redirect(
      new URL("/checkout?status=callback", req.url).toString(),
      303
    );
  }
}
