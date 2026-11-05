import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
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
  ValidateIf,
  ValidateNested,
} from 'class-validator';

import { Trim } from '../../common/validation/trim.decorator.js';
import { MAX_PURCHASE_LOTS } from '../domain/purchase-lots.js';
import {
  CalculationBasis,
  FreightChargeParty,
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

// One lot per variety and quality of the active sacks (spec 010).
export class SettlePurchaseLotDto {
  @IsUUID()
  varietyId!: string;

  @ValidateIf((_lot, value: unknown) => value !== null)
  @IsUUID()
  qualityId!: string | null;

  @IsEnum(CalculationBasis)
  priceBasis!: CalculationBasis;

  @IsInt()
  @Min(1)
  @Max(9_000_000_000_000)
  unitPriceCents!: number;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(60)
  name?: string | null;
}

// Either `lots` or the single `priceBasis` + `unitPriceCents` of earlier app
// versions; the service rejects both or neither.
export class SettlePurchaseDto {
  @IsUUID()
  clientOperationId!: string;

  @IsInt()
  @Min(0)
  expectedReceptionVersion!: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_PURCHASE_LOTS)
  @ValidateNested({ each: true })
  @Type(() => SettlePurchaseLotDto)
  lots?: SettlePurchaseLotDto[];

  @IsOptional()
  @IsEnum(CalculationBasis)
  priceBasis?: CalculationBasis;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9_000_000_000_000)
  unitPriceCents?: number;

  @IsOptional()
  @IsEnum(CalculationBasis)
  freightBasis?: CalculationBasis;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9_000_000_000_000)
  freightRateCents?: number;

  @IsOptional()
  @IsEnum(FreightChargeParty)
  freightChargedTo?: FreightChargeParty;

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
