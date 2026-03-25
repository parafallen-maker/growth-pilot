import { strictObject, trimmedString } from '../../../common/validation';

export class LoginDto {
  static schema = strictObject({
    username: trimmedString(3, 64),
    password: trimmedString(8, 128),
  });

  username!: string;
  password!: string;
}

export class RefreshTokenDto {
  static schema = strictObject({
    refreshToken: trimmedString(32, 4096),
  });

  refreshToken!: string;
}
