import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { Trim } from '../../common/validation/trim.decorator.js';

export class CreateProviderDto {
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(32)
  phone?: string;
}

export class UpdateProviderDto {
  @IsOptional()
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(32)
  phone?: string;
}

export class CreateVarietyDto {
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;
}

export class UpdateVarietyDto {
  @IsOptional()
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;
}

export class CreateBuyerDto {
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(160)
  destinationDepartment?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9_000_000_000_000)
  creditLimitCents?: number | null;
}

export class UpdateBuyerDto {
  @IsOptional()
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(160)
  destinationDepartment?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9_000_000_000_000)
  creditLimitCents?: number | null;
}
