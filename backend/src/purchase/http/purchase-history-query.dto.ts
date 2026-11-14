import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import { PageQueryDto } from '../../common/http/page-query.dto.js';
import { Trim } from '../../common/validation/trim.decorator.js';

export const purchaseHistoryStates = [
  'paid',
  'debt',
  'voided',
  'unsettled',
] as const;
export type PurchaseHistoryState = (typeof purchaseHistoryStates)[number];

// Spec 011 (RQ-ST05): filters of «Ver compras»; the summary ignores the page.
export class PurchaseHistoryFilterDto extends PageQueryDto {
  @IsOptional()
  @Matches(/^(?!0000)\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  from?: string;

  @IsOptional()
  @Matches(/^(?!0000)\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  to?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  search?: string;

  @IsOptional()
  @IsUUID()
  providerId?: string;
}

export class PurchaseHistoryQueryDto extends PurchaseHistoryFilterDto {
  @IsOptional()
  @IsIn(purchaseHistoryStates)
  paymentState?: PurchaseHistoryState;
}
