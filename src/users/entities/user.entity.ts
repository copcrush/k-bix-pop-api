import { Exclude } from 'class-transformer';

/**
 * Serializable user shape for API responses. Sensitive columns are stripped by {@link ClassSerializerInterceptor}.
 */
export class UserEntity {
  id!: string;
  email!: string;
  firstName!: string | null;
  lastName!: string | null;
  phone!: string | null;
  role!: string;
  createdAt!: Date;
  updatedAt!: Date;

  @Exclude()
  password?: string | null;

  @Exclude()
  refreshToken?: string | null;

  @Exclude()
  passwordResetToken?: string | null;

  @Exclude()
  passwordResetExpires?: Date | null;
}
