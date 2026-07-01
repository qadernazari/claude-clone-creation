export function buildZarinpalPaymentUrl({
  amountToman,
  kind,
  itemId,
  userId,
  description,
}: {
  amountToman: number;
  kind: string;
  itemId: string;
  userId: string;
  description?: string;
}): string {
  const callbackUrl = `https://ir.show/api/public/ir-payments/callback?kind=${kind}&itemId=${encodeURIComponent(itemId)}&userId=${encodeURIComponent(userId)}`;
  const desc =
    description ??
    (kind === "membership"
      ? "عضویت در پلتفرم ایران"
      : kind === "ticket"
      ? "بلیت فیلم ایران"
      : "حمایت از ایران");

  const params = new URLSearchParams({
    amount: String(amountToman),
    description: desc,
    callbackUrl,
  });

  return `https://pay.ir.show?${params.toString()}`;
}
