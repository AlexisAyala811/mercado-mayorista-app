import {
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { Trim } from '../../common/validation/trim.decorator.js';

export class CreateAssistantDto {
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  username!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(256)
  password!: string;
}

export class ResetAssistantPasswordDto {
  @IsString()
  @MinLength(12)
  @MaxLength(256)
  password!: string;
}

export class CreateDelegationDto {
  @IsDateString()
  startsAt!: string;

  @IsDateString()
  expiresAt!: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(240)
  reason?: string;
}
