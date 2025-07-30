import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GatewayController } from './gateway.controller';
import { GatewayService } from './gateway.service';
import { RateLimitService } from './services/rate-limit.service';
import { ApiKeyService } from './services/api-key.service';
import { AnalyticsService } from './services/analytics.service';
import { ThrottleService } from './services/throttle.service';
import { TransformService } from './services/transform.service';
import { VersioningService } from './services/versioning.service';
import { ApiKey } from './entities/api-key.entity';
import { ApiUsage } from './entities/api-usage.entity';
import { RateLimit } from './entities/rate-limit.entity';
import { GatewayMiddleware } from './middleware/gateway.middleware';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { ApiKeyGuard } from './guards/api-key.guard';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([ApiKey, ApiUsage, RateLimit]),
  ],
  controllers: [GatewayController],
  providers: [
    GatewayService,
    RateLimitService,
    ApiKeyService,
    AnalyticsService,
    ThrottleService,
    TransformService,
    VersioningService,
    GatewayMiddleware,
    RateLimitGuard,
    ApiKeyGuard,
  ],
  exports: [
    GatewayService,
    RateLimitService,
    ApiKeyService,
    AnalyticsService,
    ThrottleService,
    TransformService,
    VersioningService,
    GatewayMiddleware,
    RateLimitGuard,
    ApiKeyGuard,
  ],
})
export class GatewayModule {} 