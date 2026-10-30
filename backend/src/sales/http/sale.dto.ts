import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
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
} from '../../purchase/entities/purchase-settlement.entity.js';

const kilogramPattern = /^(?:0|[1-9]\d{0,10})(?:\.\d{1,3})?$/;

export class SaleLineDto {
  @IsUUID()
  varietyId!: string;

  @IsOptional() @IsUUID() qualityId?:string|null;
  @IsOptional() @IsUUID() originId?:string|null;

  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  sacks!: number;

  @IsString()
  @Matches(kilogramPattern)
  weightKg!: string;

  @IsEnum(CalculationBasis)
  priceBasis!: CalculationBasis;

  @IsInt()
  @Min(1)
  @Max(9_000_000_000_000)
  unitPriceCents!: number;
}

export class SaleInstallmentDto {
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dueOn!: string;

  @IsInt()
  @Min(1)
  @Max(9_000_000_000_000)
  amountCents!: number;
}

export class CreateSaleDto {
  @IsUUID()
  clientOperationId!: string;

  @IsUUID()
  buyerId!: string;

  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  destinationDepartment!: string;

  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(160)
  driverName?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique((line: SaleLineDto) => JSON.stringify([line.varietyId,line.qualityId??null,line.originId??null]))
  @ValidateNested({ each: true })
  @Type(() => SaleLineDto)
  lines!: SaleLineDto[];

  @IsOptional()
  @IsEnum(CalculationBasis)
  freightBasis?: CalculationBasis;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9_000_000_000_000)
  freightRateCents?: number;

  @IsBoolean()
  freightIncludedInTotal!: boolean;

  @IsInt()
  @Min(0)
  @Max(9_000_000_000_000)
  discountsCents!: number;

  @IsEnum(PaymentMode)
  paymentMode!: PaymentMode;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleInstallmentDto)
  installments!: SaleInstallmentDto[];

  @IsOptional()
  @IsBoolean()
  authorizeCreditLimitOverride?: boolean;
}

export class VoidSaleDto {
  @IsUUID()
  clientOperationId!: string;

  @IsInt()
  @Min(0)
  expectedSaleVersion!: number;

  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  reason!: string;
}

export class CommercialReturnLineDto {
  @IsUUID()
  saleLineId!: string;

  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  sacks!: number;

  @IsString()
  @Matches(kilogramPattern)
  weightKg!: string;

  @IsInt()
  @Min(1)
  @Max(9_000_000_000_000)
  authorizedGrossCents!: number;
}

export class CreateCommercialReturnDto {
  @IsUUID()
  clientOperationId!: string;

  @IsInt()
  @Min(0)
  expectedSaleVersion!: number;

  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  reason!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique((line: CommercialReturnLineDto) => line.saleLineId)
  @ValidateNested({ each: true })
  @Type(() => CommercialReturnLineDto)
  lines!: CommercialReturnLineDto[];

  @IsInt()
  @Min(0)
  @Max(9_000_000_000_000)
  freightAdjustmentCents!: number;
}
