import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/services/prisma.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { GoogleAuthResponse, GoogleUser, JwtPayload, LoginUserResponse, RegisterUserResponse } from './types';
import { generateSlug, throwError } from '../common/utils/helpers';
import { ApiResponse } from '../common/types/type';
import { hashPassword, verifyPassword } from '../common/utils/hash';
import { LoginProvider, UserRole } from '@db';
import { CookieOptions, Response } from 'express';
import { User } from '@db';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private async signJwtTokenToCookies(res: Response, payload: JwtPayload): Promise<string> {
    const token = await this.jwtService.signAsync(payload);

    const cookieOptions: CookieOptions = {
      maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    };

    res.cookie('token', token, cookieOptions);
    return token;
  }

  async register(res: Response, registerDto: RegisterDto): Promise<ApiResponse<RegisterUserResponse>> {
    try {
      const { name, email, password } = registerDto;

      const existingUser = await this.prisma.user.findUnique({
        where: { email },
      });
      if (existingUser) throw throwError('User already exists', HttpStatus.BAD_REQUEST);

      const { salt, hash } = hashPassword(password);

      const user = await this.prisma.user.create({
        data: { name, email, password: hash, salt, role: UserRole.USER },
        omit: {
          password: true,
          salt: true,
        },
      });

      if (!user) throw throwError('Failed to create user', HttpStatus.INTERNAL_SERVER_ERROR);

      const payload: JwtPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
      };
      const token = await this.signJwtTokenToCookies(res, payload);

      return {
        message: 'Registration successful',
        success: true,
        data: { user, token },
      };
    } catch (error: any) {
      throw throwError(error.message || 'Registration failed', error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async login(res: Response, loginDto: LoginDto): Promise<ApiResponse<LoginUserResponse>> {
    try {
      const { email, password } = loginDto;

      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!user) throw throwError('Invalid Credentials', HttpStatus.BAD_REQUEST);

      if (!verifyPassword({ password, salt: user.salt || '', hash: user.password || '' }))
        throw throwError('Invalid Credentials', HttpStatus.BAD_REQUEST);

      const payload: JwtPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
      };

      const token = await this.signJwtTokenToCookies(res, payload);
      const { password: _, salt: __, ...userWithoutPassword } = user;

      return {
        message: 'Login successful',
        success: true,
        data: { user: userWithoutPassword, token },
      };
    } catch (error: any) {
      throw throwError(error.message || 'Something went wrong', error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async logout(user: User, res: Response): Promise<ApiResponse<void>> {
    try {
      const cookieOptions: CookieOptions = {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
      };

      res.clearCookie('token', cookieOptions);
      return {
        message: 'Logout successful',
        success: true,
      };
    } catch (err: any) {
      throw throwError(err.message || 'Logout failed', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async registerGoogleUser(res: Response, user: GoogleUser) {
    try {
      const fullName =
        !user.firstName && !user.lastName ? user.email : `${user.lastName || ''} ${user.firstName || ''}`.trim();

      const createdUser = await this.prisma.user.create({
        data: {
          name: fullName,
          email: user.email,
          role: UserRole.USER,
          loginProvider: LoginProvider.GOOGLE,
          isEmailVerified: true,
        },
        omit: {
          password: true,
          salt: true,
        },
      });

      if (!createdUser) throw throwError('Failed to create user', HttpStatus.INTERNAL_SERVER_ERROR);

      const payload = {
        email: createdUser.email,
        id: createdUser.id,
        role: createdUser.role,
      };

      const token = await this.signJwtTokenToCookies(res, payload);

      return {
        message: 'Sign in with Google successful',
        success: true,
        data: { user: createdUser, token },
      };
    } catch (error: any) {
      throw throwError(
        error.message || 'Failed to register Google user',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async signInWithGoogle(user: GoogleUser, res: Response): Promise<ApiResponse<GoogleAuthResponse>> {
    try {
      if (!user) throw throwError('Unauthorized', HttpStatus.UNAUTHORIZED);
      const existingUser = await this.prisma.user.findUnique({
        where: { email: user.email },
        omit: { password: true, salt: true },
      });

      if (!existingUser) return this.registerGoogleUser(res, user);

      const payload: JwtPayload = {
        id: existingUser.id,
        email: existingUser.email,
        role: existingUser.role,
      };

      const token = await this.signJwtTokenToCookies(res, payload);

      return {
        message: 'Sign in with Google successful',
        success: true,
        data: { user: existingUser, token },
      };
    } catch (error: any) {
      throw throwError(
        error.message || 'Failed to sign in with Google',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
