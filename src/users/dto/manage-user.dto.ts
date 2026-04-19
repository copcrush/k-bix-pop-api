import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

/** Profile + optional password change (single PATCH `/users/me`). */
export class ManageUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @ValidateIf((o: ManageUserDto) => typeof o.newPassword === 'string' && o.newPassword.length > 0)
  @IsString()
  @MinLength(1, { message: 'Current password is required to change password' })
  currentPassword?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'New password must include uppercase, lowercase, and a number',
  })
  newPassword?: string;
}
