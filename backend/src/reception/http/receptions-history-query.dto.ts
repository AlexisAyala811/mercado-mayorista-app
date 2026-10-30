import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PageQueryDto } from '../../common/http/page-query.dto.js';
import { Trim } from '../../common/validation/trim.decorator.js';
import { ReceptionState } from '../entities/reception.entity.js';

export class ReceptionsHistoryQueryDto extends PageQueryDto {
  @IsOptional()
  @Matches(/^(?!0000)\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  from?: string;

  @IsOptional()
  @Matches(/^(?!0000)\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  to?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  search?: string;

  @IsOptional()
  @IsUUID()
  providerId?: string;

  @IsOptional()
  @IsEnum(ReceptionState)
  state?: ReceptionState;
}
