import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GatewayService } from './gateway.service';
import { ApiKeyService } from './services/api-key.service';
import { AnalyticsService } from './services/analytics.service';
import { RateLimitService } from './services/rate-limit.service';
import { ThrottleService } from './services/throttle.service';
import { TransformService } from './services/transform.service';
import { VersioningService } from './services/versioning.service';
import { ApiKeyGuard } from './guards/api-key.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';
import { AnalyticsQueryDto } from './dto/analytics.dto';

@ApiTags('Gateway')
@Controller('gateway')
export class GatewayController {
  constructor(
    private readonly gatewayService: GatewayService,
    private readonly apiKeyService: ApiKeyService,
    private readonly analyticsService: AnalyticsService,
    private readonly rateLimitService: RateLimitService,
    private readonly throttleService: ThrottleService,
    private readonly transformService: TransformService,
    private readonly versioningService: VersioningService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Gateway health check' })
  @ApiResponse({ status: 200, description: 'Gateway is healthy' })
  async healthCheck() {
    return this.gatewayService.healthCheck();
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get gateway statistics' })
  @ApiResponse({ status: 200, description: 'Gateway statistics' })
  async getStatistics() {
    return this.gatewayService.getStatistics();
  }

  // API Key Management
  @Post('api-keys')
  @ApiOperation({ summary: 'Create new API key' })
  @ApiResponse({ status: 201, description: 'API key created successfully' })
  async createApiKey(@Body() createApiKeyDto: CreateApiKeyDto) {
    return this.apiKeyService.createApiKey(createApiKeyDto);
  }

  @Get('api-keys')
  @ApiOperation({ summary: 'Get all API keys' })
  @ApiResponse({ status: 200, description: 'List of API keys' })
  async getAllApiKeys() {
    return this.apiKeyService.findAll();
  }

  @Get('api-keys/:id')
  @ApiOperation({ summary: 'Get API key by ID' })
  @ApiResponse({ status: 200, description: 'API key details' })
  async getApiKey(@Param('id') id: string) {
    return this.apiKeyService.findOne(id);
  }

  @Put('api-keys/:id')
  @ApiOperation({ summary: 'Update API key' })
  @ApiResponse({ status: 200, description: 'API key updated successfully' })
  async updateApiKey(
    @Param('id') id: string,
    @Body() updateApiKeyDto: UpdateApiKeyDto,
  ) {
    return this.apiKeyService.update(id, updateApiKeyDto);
  }

  @Delete('api-keys/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete API key' })
  @ApiResponse({ status: 204, description: 'API key deleted successfully' })
  async deleteApiKey(@Param('id') id: string) {
    await this.apiKeyService.remove(id);
  }

  // Analytics
  @Get('analytics')
  @ApiOperation({ summary: 'Get usage analytics' })
  @ApiResponse({ status: 200, description: 'Usage analytics data' })
  async getAnalytics(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getUsageStats(query);
  }

  @Get('analytics/endpoints/:endpoint')
  @ApiOperation({ summary: 'Get endpoint analytics' })
  @ApiResponse({ status: 200, description: 'Endpoint analytics data' })
  async getEndpointAnalytics(
    @Param('endpoint') endpoint: string,
    @Query('days') days: number = 30,
  ) {
    return this.analyticsService.getEndpointAnalytics(endpoint, days);
  }

  @Get('analytics/api-keys/:apiKeyId')
  @ApiOperation({ summary: 'Get API key analytics' })
  @ApiResponse({ status: 200, description: 'API key analytics data' })
  async getApiKeyAnalytics(
    @Param('apiKeyId') apiKeyId: string,
    @Query('days') days: number = 30,
  ) {
    return this.analyticsService.getApiKeyAnalytics(apiKeyId, days);
  }

  // Rate Limiting
  @Get('rate-limits/:identifier')
  @ApiOperation({ summary: 'Get rate limit info' })
  @ApiResponse({ status: 200, description: 'Rate limit information' })
  async getRateLimitInfo(
    @Param('identifier') identifier: string,
    @Query('endpoint') endpoint: string,
    @Query('window') window: string = '1m',
  ) {
    return this.rateLimitService.getRateLimitInfo(identifier, endpoint, window);
  }

  @Post('rate-limits/:identifier/reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reset rate limit' })
  @ApiResponse({ status: 204, description: 'Rate limit reset successfully' })
  async resetRateLimit(
    @Param('identifier') identifier: string,
    @Query('endpoint') endpoint: string,
    @Query('window') window: string = '1m',
  ) {
    await this.rateLimitService.resetRateLimit(identifier, endpoint, window);
  }

  // Throttling
  @Get('throttle/status')
  @ApiOperation({ summary: 'Get throttle status' })
  @ApiResponse({ status: 200, description: 'Throttle status information' })
  async getThrottleStatus() {
    return this.throttleService.getAllQueueStatuses();
  }

  @Get('throttle/status/:identifier')
  @ApiOperation({ summary: 'Get specific throttle status' })
  @ApiResponse({ status: 200, description: 'Specific throttle status' })
  async getSpecificThrottleStatus(@Param('identifier') identifier: string) {
    return this.throttleService.getQueueStatus(identifier);
  }

  @Post('throttle/:identifier/clear')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear throttle queue' })
  @ApiResponse({ status: 204, description: 'Queue cleared successfully' })
  async clearThrottleQueue(@Param('identifier') identifier: string) {
    this.throttleService.clearQueue(identifier);
  }

  // Transformations
  @Get('transforms')
  @ApiOperation({ summary: 'Get all transform rules' })
  @ApiResponse({ status: 200, description: 'List of transform rules' })
  async getTransformRules() {
    return this.transformService.getAllTransformRules();
  }

  @Get('transforms/:ruleId')
  @ApiOperation({ summary: 'Get specific transform rule' })
  @ApiResponse({ status: 200, description: 'Transform rule details' })
  async getTransformRule(@Param('ruleId') ruleId: string) {
    return this.transformService.getTransformRule(ruleId);
  }

  @Delete('transforms/:ruleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete transform rule' })
  @ApiResponse({ status: 204, description: 'Transform rule deleted successfully' })
  async deleteTransformRule(@Param('ruleId') ruleId: string) {
    this.transformService.removeTransformRule(ruleId);
  }

  // Versioning
  @Get('versions')
  @ApiOperation({ summary: 'Get supported API versions' })
  @ApiResponse({ status: 200, description: 'List of supported versions' })
  async getSupportedVersions() {
    return {
      versions: this.versioningService.getSupportedVersions(),
      latest: this.versioningService.getLatestVersion(),
    };
  }

  @Get('versions/:version')
  @ApiOperation({ summary: 'Get version configuration' })
  @ApiResponse({ status: 200, description: 'Version configuration' })
  async getVersionConfig(@Param('version') version: string) {
    return this.versioningService.getVersionConfig(version);
  }

  @Get('versions/:fromVersion/migrate/:toVersion')
  @ApiOperation({ summary: 'Get migration guide' })
  @ApiResponse({ status: 200, description: 'Migration guide' })
  async getMigrationGuide(
    @Param('fromVersion') fromVersion: string,
    @Param('toVersion') toVersion: string,
  ) {
    const migrationGuide = this.versioningService.getMigrationGuide(fromVersion, toVersion);
    const breakingChanges = this.versioningService.getBreakingChanges(fromVersion, toVersion);
    
    return {
      fromVersion,
      toVersion,
      migrationGuide,
      breakingChanges,
    };
  }

  // Protected routes (require API key)
  @Get('protected/test')
  @UseGuards(ApiKeyGuard, RateLimitGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test protected endpoint' })
  @ApiResponse({ status: 200, description: 'Protected endpoint accessed successfully' })
  async testProtectedEndpoint() {
    return {
      message: 'Protected endpoint accessed successfully',
      timestamp: new Date().toISOString(),
    };
  }
} 