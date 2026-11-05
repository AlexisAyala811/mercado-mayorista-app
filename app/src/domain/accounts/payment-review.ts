import { moneyInputToCents } from "@/domain/reception/reception";

type PaymentAccount = {
  balanceCents: string;
  state: "open" | "paid" | "voided";
};
export type PaymentReview =
  | { kind: "invalid"; message: string }
  | {
      kind: "ready";
      amountCents: number;
      beforeCents: string;
      afterCents: string;
    };

export function reviewAccountPayment(
  account: PaymentAccount,
  amount: string,
): PaymentReview {
  if (account.state !== "open")
    return {
      kind: "invalid",
      message: "La cuenta no está abierta para registrar un pago o cobro.",
    };
  if (!/^\d+$/.test(account.balanceCents))
    return {
      kind: "invalid",
      message:
        "No se pudo comprobar el saldo. Actualiza la cuenta antes de continuar.",
    };
  const cents = moneyInputToCents(amount);
  if (!cents)
    return {
      kind: "invalid",
      message: "Ingresa un importe válido mayor que cero.",
    };
  if (cents > 9_000_000_000_000)
    return {
      kind: "invalid",
      message: "El importe supera el máximo admitido por operación.",
    };
  const balance = BigInt(account.balanceCents);
  if (BigInt(cents) > balance)
    return {
      kind: "invalid",
      message: "El importe no puede superar el saldo pendiente.",
    };
  return {
    kind: "ready",
    amountCents: cents,
    beforeCents: balance.toString(),
    afterCents: (balance - BigInt(cents)).toString(),
  };
}
