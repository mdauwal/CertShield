import { IsString, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { RequestStatus } from '../entities/api-usage.entity';

export class AnalyticsQueryDto {
  @IsOptional()
  @IsString()
  apiKeyId?: string;

  @IsOptional()
  @IsString()
  endpoint?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;

  @IsOptional()
  @IsString()
  groupBy?: 'hour' | 'day' | 'week' | 'month';
}

export class UsageStatsDto {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rateLimitedRequests: number;
  averageResponseTime: number;
  totalDataTransferred: number;
  uniqueEndpoints: number;
  topEndpoints: Array<{ endpoint: string; count: number }>;
  requestsByStatus: Record<RequestStatus, number>;
  requestsByHour: Array<{ hour: string; count: number }>;
} 