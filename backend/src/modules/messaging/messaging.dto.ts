import { IsIn, IsInt, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import type { ShareState } from './share-attempt.entity.js';

export class ShareAttemptDto {
  @IsUUID() clientOperationId!: string;
  @IsUUID() recipientId!: string;
  @IsIn(['buyer', 'provider']) recipientKind!: 'buyer' | 'provider';
  @IsIn(['whatsapp', 'email']) channel!: 'whatsapp' | 'email';
  @IsString() @MaxLength(160) filename!: string;
  @IsString() @MaxLength(100) mimeType!: string;
  @IsInt() @Min(1) @Max(20 * 1024 * 1024) sizeBytes!: number;
  @IsIn(['prepared', 'sharing_requested', 'failed']) state!: ShareState;
}
