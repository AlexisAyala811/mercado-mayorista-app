import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

import { PageQueryDto } from '../../../platform/common/http/page-query.dto.js';
import { Trim } from '../../../platform/common/validation/trim.decorator.js';

// Spec 023: the Administrator only manages accounts. Every write states a
// reason, which goes to the audit of the merchant and of the platform.

export class MerchantQueryDto extends PageQueryDto {
  /** Part of the business name or of the Wholesaler's username. */
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(80)
  search?: string;
}

export class CreateMerchantDto {
  @IsUUID()
  clientOperationId!: string;

  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  businessName!: string;

  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  username!: string;

  /** Shown once to the Administrator; the Wholesaler must replace it. */
  @IsString()
  @MinLength(12)
  @MaxLength(256)
  temporaryPassword!: string;
}

export class MerchantActionDto {
  @IsUUID()
  clientOperationId!: string;

  @Trim()
  @IsString()
  @MinLength(3)
  @MaxLength(240)
  reason!: string;
}

export class ResetMerchantPasswordDto extends MerchantActionDto {
  @IsString()
  @MinLength(12)
  @MaxLength(256)
  temporaryPassword!: string;
}
