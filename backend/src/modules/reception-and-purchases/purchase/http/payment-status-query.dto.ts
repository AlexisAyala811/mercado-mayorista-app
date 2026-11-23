import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export const MAX_PAYMENT_STATUS_RECEPTIONS = 100;

// `?receptionIds=a,b,c` (or the parameter repeated) for one page of «Ver compras».
export class PaymentStatusQueryDto {
  @Transform(({ value }: { value: unknown }) =>
    (Array.isArray(value) ? value : [value])
      .flatMap((item) => (typeof item === 'string' ? item.split(',') : [item]))
      .map((item) => (typeof item === 'string' ? item.trim() : item))
      .filter((item) => item !== ''),
  )
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_PAYMENT_STATUS_RECEPTIONS)
  @IsUUID(undefined, { each: true })
  receptionIds!: string[];
}
