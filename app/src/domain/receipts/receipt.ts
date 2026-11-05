export type ReceiptHistoryKind='purchases'|'sales';
export type ReceiptHistoryRow={id:string;occurredOn:string;amountCents:string;state:'confirmed'|'voided';reference:string;counterpartyName:string|null};
