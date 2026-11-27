import { IsString, MaxLength, MinLength } from 'class-validator';

import { Trim } from '../../../platform/common/validation/trim.decorator.js';

export class LoginDto {
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  username!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(256)
  password!: string;
}

// Spec 023: the user's own password change, required after a temporary one.
export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  currentPassword!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(256)
  newPassword!: string;
}
