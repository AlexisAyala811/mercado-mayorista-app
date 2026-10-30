import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

import { Trim } from '../../common/validation/trim.decorator.js';

export class CreateReceptionDto {
  @IsUUID()
  clientOperationId!: string;

  @IsUUID()
  providerId!: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(32)
  providerPhone?: string;

  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  driverName!: string;

  @IsDateString({ strict: true })
  receivedOn!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  expectedVarietyIds!: string[];
}
