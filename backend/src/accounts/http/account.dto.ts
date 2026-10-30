import {
  IsInt,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { Trim } from '../../common/validation/trim.decorator.js';

export class RegisterPaymentDto {
  @IsUUID()
  clientOperationId!: string;

  @IsInt()
  @Min(0)
  expectedAccountVersion!: number;

  @IsInt()
  @Min(1)
  @Max(9_000_000_000_000)
  amountCents!: number;
}

export class ReversePaymentDto {
  @IsUUID()
  clientOperationId!: string;

  @IsInt()
  @Min(0)
  expectedAccountVersion!: number;

  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  reason!: string;
}
