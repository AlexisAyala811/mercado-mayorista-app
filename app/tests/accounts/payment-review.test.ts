import { reviewAccountPayment } from "@/domain/accounts/payment-review";

const account = { state: "open" as const, balanceCents: "8000" };
it("reviews an exact partial payment and a complete settlement in cents", () => {
  expect(reviewAccountPayment(account, "10,01")).toEqual({
    kind: "ready",
    amountCents: 1001,
    beforeCents: "8000",
    afterCents: "6999",
  });
  expect(reviewAccountPayment(account, "80")).toEqual({
    kind: "ready",
    amountCents: 8000,
    beforeCents: "8000",
    afterCents: "0",
  });
});
it.each(["0", "-1", "10.001", "invalid", "80.01"])(
  "rejects invalid or excessive input %s before submission",
  (amount) => {
    expect(reviewAccountPayment(account, amount).kind).toBe("invalid");
  },
);
it("preserves a large central balance without Number conversion", () => {
  expect(
    reviewAccountPayment(
      { ...account, balanceCents: "9007199254740993" },
      "0.01",
    ),
  ).toEqual({
    kind: "ready",
    amountCents: 1,
    beforeCents: "9007199254740993",
    afterCents: "9007199254740992",
  });
});
it("blocks closed accounts and balances which cannot be verified", () => {
  expect(reviewAccountPayment({ ...account, state: "paid" }, "1").kind).toBe(
    "invalid",
  );
  expect(reviewAccountPayment({ ...account, state: "voided" }, "1").kind).toBe(
    "invalid",
  );
  expect(
    reviewAccountPayment({ ...account, balanceCents: "invalid" }, "1").kind,
  ).toBe("invalid");
});
it("respects the existing central per-operation ceiling", () => {
  expect(
    reviewAccountPayment(
      { ...account, balanceCents: "9000000000001" },
      "90000000000.01",
    ),
  ).toEqual({
    kind: "invalid",
    message: "El importe supera el máximo admitido por operación.",
  });
});
