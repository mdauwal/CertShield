import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RateLimitService } from '../services/rate-limit.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly rateLimitService: RateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.apiKey;

    if (!apiKey) {
      throw new ForbiddenException('API key required for rate limiting');
    }

    const endpoint = request.route?.path || request.url;
    const result = await this.rateLimitService.checkRateLimit(
      apiKey.id,
      endpoint,
      '1m',
      apiKey.rateLimit,
    );

    if (!result.allowed) {
      throw new ForbiddenException('Rate limit exceeded');
    }

    // Add rate limit headers to response
    const response = context.switchToHttp().getResponse();
    response.setHeader('X-RateLimit-Remaining', result.remaining);
    response.setHeader('X-RateLimit-Reset', result.resetAt.toISOString());

    return true;
  }
} 