import { User } from '@db';
import { UserRole } from '@db';

export type JwtPayload = {
  id: string;
  email: string;
  role: UserRole;
};

export interface GoogleUser {
  email: string;
  firstName: string;
  lastName: string;
  picture: string;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterUserResponse {
  user: Omit<User, 'password' | 'salt'>;
  token: string;
}

export interface LoginUserResponse {
  user: Omit<User, 'password' | 'salt'>;
  token: string;
}

export interface GoogleAuthResponse {
  user: Omit<User, 'password' | 'salt'>;
  token: string;
}
