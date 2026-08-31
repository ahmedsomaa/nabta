import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '@nabta/types';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  register(@Body() body: unknown) {
    return this.auth.register(body);
  }

  @Post('login')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  login(@Body() body: unknown) {
    return this.auth.login(body);
  }

  @Post('refresh')
  refresh(@Body() body: unknown) {
    return this.auth.refresh(body);
  }

  @Post('logout')
  logout(@Body() body: unknown) {
    return this.auth.logout(body);
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  forgotPassword(@Body() body: unknown) {
    return this.auth.forgotPassword(body);
  }

  @Post('reset-password')
  resetPassword(@Body() body: unknown) {
    return this.auth.resetPassword(body);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }
}
