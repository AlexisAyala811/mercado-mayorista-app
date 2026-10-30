import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { Trim } from '../../common/validation/trim.decorator.js';
import {
  CalculationBasis,
  PaymentMode,
} from '../entities/purchase-settlement.entity.js';

export class PurchaseInstallmentDto {
  @IsDateString({ strict: true })
  dueOn!: string;

  @IsInt()
  @Min(1)
  @Max(9_000_000_000_000)
  amountCents!: number;
}

export class SettlePurchaseDto {
  @IsUUID()
  clientOperationId!: string;

  @IsInt()
  @Min(0)
  expectedReceptionVersion!: number;

  @IsEnum(CalculationBasis)
  priceBasis!: CalculationBasis;

  @IsInt()
  @Min(1)
  @Max(9_000_000_000_000)
  unitPriceCents!: number;

  @IsOptional()
  @IsEnum(CalculationBasis)
  freightBasis?: CalculationBasis;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9_000_000_000_000)
  freightRateCents?: number;

  @IsInt()
  @Min(0)
  @Max(9_000_000_000_000)
  advancesCents!: number;

  @IsInt()
  @Min(0)
  @Max(9_000_000_000_000)
  discountsCents!: number;

  @IsEnum(PaymentMode)
  paymentMode!: PaymentMode;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseInstallmentDto)
  installments!: PurchaseInstallmentDto[];
}

export class VoidPurchaseDto {
  @IsUUID()
  clientOperationId!: string;

  @IsInt()
  @Min(0)
  expectedPurchaseVersion!: number;

  @IsInt()
  @Min(0)
  expectedReceptionVersion!: number;

  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  reason!: string;
}
