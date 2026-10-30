import { IsString, MaxLength, MinLength } from 'class-validator';

import { Trim } from '../../common/validation/trim.decorator.js';

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
