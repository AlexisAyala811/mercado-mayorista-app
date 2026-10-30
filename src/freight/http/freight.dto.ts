import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsUUID,
} from 'class-validator';

export class SettleFreightDto {
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
