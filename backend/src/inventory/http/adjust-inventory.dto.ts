import {
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
} from 'class-validator';

import { Trim } from '../../common/validation/trim.decorator.js';

const signedKilogramPattern = /^-?(?:0|[1-9]\d{0,8})(?:\.\d{1,3})?$/;

export enum InventoryAdjustmentKind {
  Correction = 'correction',
  Loss = 'loss',
  Return = 'return',
}

export class AdjustInventoryDto {
  @IsUUID()
  clientOperationId!: string;

  @IsEnum(InventoryAdjustmentKind)
  kind!: InventoryAdjustmentKind;

  @IsOptional()
  @IsUUID()
  sourceSaleId?: string;

  @IsInt()
  @Min(-1_000_000_000)
  @Max(1_000_000_000)
  sackDelta!: number;

  @IsString()
  @Matches(signedKilogramPattern)
  weightDeltaKg!: string;

  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  expectedVersion!: number;

  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  reason!: string;
}
