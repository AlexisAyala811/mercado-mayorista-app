import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

import { Trim } from '../../common/validation/trim.decorator.js';

export class CreateCarrierDto {
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

export class UpdateCarrierDto {
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

export class CreateVehicleDto {
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  plate!: string;

  @IsOptional()
  @IsUUID()
  carrierId?: string | null;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(160)
  description?: string;
}

export class UpdateVehicleDto {
  @IsOptional()
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  plate?: string;

  @IsOptional()
  @IsUUID()
  carrierId?: string | null;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(160)
  description?: string;
}
