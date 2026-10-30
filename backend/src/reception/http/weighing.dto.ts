import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { Trim } from '../../common/validation/trim.decorator.js';

const kilogramPattern = /^(?:0|[1-9]\d{0,8})(?:\.\d{1,3})?$/;

export class AddSackDto {
  @IsUUID()
  clientOperationId!: string;

  @IsInt()
  @Min(0)
  expectedReceptionVersion!: number;

  @IsUUID()
  varietyId!: string;

  @IsOptional() @IsUUID() qualityId?:string|null;
  @IsOptional() @IsUUID() originId?:string|null;

  @IsString()
  @Matches(kilogramPattern)
  grossWeightKg!: string;

  @IsOptional()
  @IsString()
  @Matches(kilogramPattern)
  tareKg?: string;
}

export class CorrectSackDto extends AddSackDto {}

export class CorrectClosedSackDto extends CorrectSackDto {
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  reason!: string;
}

export class VoidSackDto {
  @IsUUID()
  clientOperationId!: string;

  @IsInt()
  @Min(0)
  expectedReceptionVersion!: number;

  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  reason!: string;
}

export class CloseWeighingDto {
  @IsUUID()
  clientOperationId!: string;

  @IsInt()
  @Min(0)
  expectedReceptionVersion!: number;
}
