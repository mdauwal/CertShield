import { Controller, Post, UseGuards, Request } from '@nestjs/common';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req) {
    return req.user; // Or pass to a service to sign JWT
  }

  @UseGuards(JwtAuthGuard)
  @Post('protected')
  getProtectedData(@Request() req) {
    return { message: 'You are authenticated', user: req.user };
  }
}