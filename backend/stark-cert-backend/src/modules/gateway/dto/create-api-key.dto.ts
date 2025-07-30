import { IsString, IsOptional, IsEnum, IsInt, IsDateString, IsArray, Min, Max } from 'class-validator';
import { ApiKeyTier } from '../entities/api-key.entity';

export class CreateApiKeyDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ApiKeyTier)
  tier?: ApiKeyTier;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000000)
  rateLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000000)
  monthlyQuota?: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedEndpoints?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  blockedEndpoints?: string[];

  @IsOptional()
  metadata?: Record<string, any>;
} 