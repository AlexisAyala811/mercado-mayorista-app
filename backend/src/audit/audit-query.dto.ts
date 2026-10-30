import { IsDateString, IsOptional, IsString, MaxLength, Matches } from 'class-validator';

import { PageQueryDto } from '../common/http/page-query.dto.js';
import { Trim } from '../common/validation/trim.decorator.js';

export class AuditQueryDto extends PageQueryDto {
  @IsOptional()
  @Matches(/^(?!0000)\d{4}-\d{2}-\d{2}$/, { message: 'Usa AAAA-MM-DD con año entre 0001 y 9999 para la fecha inicial.' })
  @IsDateString({ strict: true }, { message: 'La fecha inicial debe existir.' })
  fromDay?: string;

  @IsOptional()
  @Matches(/^(?!0000)\d{4}-\d{2}-\d{2}$/, { message: 'Usa AAAA-MM-DD con año entre 0001 y 9999 para la fecha final.' })
  @IsDateString({ strict: true }, { message: 'La fecha final debe existir.' })
  toDay?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  action?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(80)
  resourceType?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
