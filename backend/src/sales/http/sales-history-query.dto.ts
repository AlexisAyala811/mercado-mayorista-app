import {
  IsDateString,
  IsEnum,
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
import { SaleState } from '../entities/sale.entity.js';

// Spec 011 (RQ-ST05): filters of «Ver ventas»; the summary ignores the page.
export class SalesHistoryFilterDto extends PageQueryDto {
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
  buyerId?: string;

  @IsOptional()
  @IsEnum(SaleState)
  state?: SaleState;
}

export class SalesHistoryQueryDto extends SalesHistoryFilterDto {
  @IsOptional()
  @IsIn(['paid', 'debt', 'voided'])
  paymentState?: 'paid' | 'debt' | 'voided';
}
