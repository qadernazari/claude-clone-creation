const ZARINPAL_REQUEST_URL = "https://api.zarinpal.com/pg/v4/payment/request.json";
const ZARINPAL_STARTPAY_URL = "https://www.zarinpal.com/pg/StartPay/";
const MERCHANT_ID = "2952f848-cfec-4ab9-8581-753ef5c42b02";

export async function requestZarinpalPayment({
  amountToman,
  kind,
  itemId,
  userId,
  callbackUrl,
}: {
  amountToman: number;
  kind: string;
  itemId: string;
  userId: string;
  callbackUrl: string;
}): Promise<{ redirectUrl: string; authority: string } | { error: string }> {
  const description =
    kind === "membership"
      ? "عضویت در پلتفرم ایران"
      : kind === "ticket"
      ? "بلیت فیلم ایران"
      : "حمایت از ایران";

  try {
    const res = await fetch(ZARINPAL_REQUEST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        merchant_id: MERCHANT_ID,
        amount: amountToman,
        currency: "IRT",
        description,
        callback_url: callbackUrl,
        metadata: { kind, itemId, userId },
      }),
    });

    const json = (await res.json()) as {
      data?: { code: number; authority: string };
      errors?: { code: number; message: string } | unknown[];
    };

    if (json.data?.code === 100 && json.data.authority) {
      return {
        redirectUrl: `${ZARINPAL_STARTPAY_URL}${json.data.authority}`,
        authority: json.data.authority,
      };
    }

    const errObj =
      json.errors && !Array.isArray(json.errors)
        ? (json.errors as { message: string })
        : null;
    return { error: errObj?.message ?? `کد خطا: ${json.data?.code ?? "نامشخص"}` };
  } catch (err) {
    return { error: `خطا در اتصال: ${err instanceof Error ? err.message : String(err)}` };
  }
}
