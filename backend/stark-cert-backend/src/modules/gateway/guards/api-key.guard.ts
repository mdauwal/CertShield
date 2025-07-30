import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeyService } from '../services/api-key.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    try {
      const validatedApiKey = await this.apiKeyService.validateApiKey(apiKey);
      request.apiKey = validatedApiKey;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid API key');
    }
  }

  private extractApiKey(request: any): string | null {
    // Check various locations for API key
    return (
      request.headers['x-api-key'] ||
      request.headers['authorization']?.replace('Bearer ', '') ||
      request.query.apiKey ||
      null
    );
  }
} 