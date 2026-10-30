import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { Trim } from '../../common/validation/trim.decorator.js';
import {
  StowageActivity,
  StowageOperationType,
} from '../entities/stowage-entry.entity.js';

export class CreateWorkGroupDto {
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;
}

export class CreateStowageEntryDto {
  @IsUUID()
  clientOperationId!: string;

  @IsUUID()
  workGroupId!: string;

  @IsEnum(StowageOperationType)
  operationType!: StowageOperationType;

  @IsUUID()
  operationId!: string;

  @IsEnum(StowageActivity)
  activity!: StowageActivity;

  @IsInt()
  @Min(1)
  @Max(9_000_000_000_000)
  amountCents!: number;

  @IsDateString({ strict: true })
  occurredOn!: string;
}

export class SettleStowageDto {
  @IsUUID()
  clientOperationId!: string;

  @IsDateString({ strict: true })
  settledOn!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  entryIds!: string[];
}
