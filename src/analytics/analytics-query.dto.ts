import { Equals, IsBoolean, IsOptional, IsUUID, ValidateIf } from 'class-validator';
import { PageQueryDto } from '../common/http/page-query.dto.js';
import {
  ReportAsOfDto,
  ReportPeriodDto,
} from '../reports/http/report-query.dto.js';
export class AnalyticsSeriesQueryDto extends ReportPeriodDto {
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

export class AnalyticsReadinessQueryDto extends ReportAsOfDto {
  @IsUUID()
  varietyId!: string;
}

export class CreateAnalyticsEvaluationDto extends AnalyticsReadinessQueryDto {
  @IsUUID()
  clientOperationId!: string;
}
export class EvaluationListQueryDto extends PageQueryDto {
  @IsUUID()
  varietyId!: string;
}
export class CreatePredictionPublicationDto {
  @IsUUID()
  evaluationId!:string;
  @IsUUID()
  clientOperationId!:string;
  @IsBoolean()
  @Equals(true)
  reviewed!:true;
}

export class CreatePublicationOutcomeDto {
  @IsUUID()
  clientOperationId!:string;
}
