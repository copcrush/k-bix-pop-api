import { Exclude, Type } from 'class-transformer';
import { UserEntity } from '../../users/entities/user.entity';

/** POST /auth/register */
export class AuthRegisterResponseEntity {
  message!: string;

  @Type(() => UserEntity)
  user!: UserEntity;
}

/** POST /auth/login (refresh token is set via HttpOnly cookie, not this body) */
export class AuthLoginResponseEntity {
  message!: string;

  @Type(() => UserEntity)
  user!: UserEntity;

  accessToken!: string;

  /** Used by {@link AuthController} for the HttpOnly cookie; stripped from JSON by serialization. */
  @Exclude()
  refreshToken!: string;
}
