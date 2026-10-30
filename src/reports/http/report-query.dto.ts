import { IsDateString, IsIn, IsOptional, IsUUID, Matches, ValidateIf, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ReportPeriodDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  from!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  to!: string;
}

export class OperationOverviewQueryDto extends ReportPeriodDto {
  @IsIn(['purchase', 'sale'])
  operation!: 'purchase' | 'sale';
}

export class ReportExportQueryDto extends OperationOverviewQueryDto {
  @IsIn(['summary', 'detail', 'counterparty', 'variety'])
  report!: 'summary' | 'detail' | 'counterparty' | 'variety';
}

export class ReportRowsQueryDto extends OperationOverviewQueryDto {
  @IsIn(['detail', 'variety'])
  report!: 'detail' | 'variety';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  offset = 0;
}

export class PriceHistoryQueryDto extends ReportPeriodDto {
  @IsOptional()
  @IsUUID()
  varietyId?: string;

  @IsOptional()
  @IsUUID()
  providerId?: string;

  @IsOptional()
  @IsUUID()
  buyerId?: string;

  @IsOptional()
  @ValidateIf((_object, value: unknown) => value !== 'unreported')
  @IsUUID()
  qualityId?: string;

  @IsOptional()
  @ValidateIf((_object, value: unknown) => value !== 'unreported')
  @IsUUID()
  originId?: string;
}

export class ReportAlertsQueryDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  asOf!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  through!: string;
}

export class ReportAsOfDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  asOf!: string;
}
