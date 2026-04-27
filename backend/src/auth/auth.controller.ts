import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { ApiResponse } from '../common/types/type';
import { LoginUserResponse, RegisterUserResponse } from './types';
import { AuthGuard } from '../common/guards/auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole, type User } from '@db';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Response } from 'express';
import { GoogleOAuthGuard } from '../common/guards/google-oauth.guard';

@ApiTags('Authentication API')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiProperty({
    title: 'Register User',
    description: 'Register a new user',
    type: RegisterDto,
  })
  async register(
    @Res({ passthrough: true }) res: Response,
    @Body() registerDto: RegisterDto,
  ): Promise<ApiResponse<RegisterUserResponse>> {
    return this.authService.register(res, registerDto);
  }

  @Post('login')
  @ApiProperty({
    title: 'Login User',
    description: 'Login a user',
    type: LoginDto,
  })
  async login(
    @Res({ passthrough: true }) res: Response,
    @Body() loginDto: LoginDto,
  ): Promise<ApiResponse<LoginUserResponse>> {
    return this.authService.login(res, loginDto);
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  @Roles(...Object.values(UserRole))
  @ApiProperty({
    title: 'Logout User',
    description: 'Logout a user',
  })
  async logout(@CurrentUser() user: User, @Res({ passthrough: true }) res: Response): Promise<ApiResponse<void>> {
    return this.authService.logout(user, res);
  }

  @UseGuards(GoogleOAuthGuard)
  @ApiProperty({ title: 'Google Auth' })
  @Get('google')
  async googleAuth(@Req() req) {}

  @UseGuards(GoogleOAuthGuard)
  @Get('google-auth-redirect')
  async googleAuthRedirect(@Req() req, @Res() res: Response) {
    await this.authService.signInWithGoogle(req.user, res);
    return res.redirect(`${process.env.GOOGLE_REDIRECT_URL_CLIENT_REACT}`);
  }
}
