import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from "./guards/local-auth.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Registration endpoint
  @Post("register")
  async register(@Body() registerDto: RegisterDto) {
    try {
      const result = await this.authService.register(registerDto);
      return {
        message: "Registration successful",
        data: result,
      };
    } catch (error) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message || "Registration failed",
      };
    }
  }

  // Login endpoint using local auth guard
  @UseGuards(LocalAuthGuard)
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Request() req: any) {
    try {
      const token = await this.authService.login(req.user);
      return {
        message: "Login successful",
        accessToken: token,
      };
    } catch (error) {
      return {
        statusCode: HttpStatus.UNAUTHORIZED,
        message: error.message || "Login failed",
      };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('protected')
  getProtectedData(@Request() req) {
    return { message: 'You are authenticated', user: req.user };
  }
}
