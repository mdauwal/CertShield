import { Injectable, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ApiKeyService } from './services/api-key.service';
import { RateLimitService } from './services/rate-limit.service';
import { AnalyticsService } from './services/analytics.service';
import { ThrottleService } from './services/throttle.service';
import { TransformService } from './services/transform.service';
import { VersioningService } from './services/versioning.service';
import { ApiKey } from './entities/api-key.entity';
import { RequestStatus } from './entities/api-usage.entity';

interface GatewayRequest {
  method: string;
  url: string;
  headers: Record<string, any>;
  body?: any;
  ip: string;
  userAgent?: string;
}

interface GatewayResponse {
  statusCode: number;
  headers: Record<string, any>;
  body: any;
}

@Injectable()
export class GatewayService {
  private readonly logger = new Logger(GatewayService.name);
  private readonly upstreamServices = new Map<string, string>();

  constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly rateLimitService: RateLimitService,
    private readonly analyticsService: AnalyticsService,
    private readonly throttleService: ThrottleService,
    private readonly transformService: TransformService,
    private readonly versioningService: VersioningService,
  ) {
    this.initializeUpstreamServices();
  }

  private initializeUpstreamServices(): void {
    // Configure upstream services for load balancing
    this.upstreamServices.set('/auth', 'http://localhost:3001');
    this.upstreamServices.set('/certificates', 'http://localhost:3002');
    this.upstreamServices.set('/users', 'http://localhost:3003');
    this.upstreamServices.set('/templates', 'http://localhost:3004');
    this.upstreamServices.set('/blockchain', 'http://localhost:3005');
  }

  async processRequest(request: GatewayRequest): Promise<GatewayResponse> {
    const startTime = Date.now();
    let apiKey: ApiKey | null = null;
    let usageData: any = null;

    try {
      // Extract API key from headers
      const apiKeyHeader = request.headers['x-api-key'] || request.headers['authorization']?.replace('Bearer ', '');
      
      if (!apiKeyHeader) {
        throw new BadRequestException('API key is required');
      }

      // Validate API key
      apiKey = await this.apiKeyService.validateApiKey(apiKeyHeader);

      // Check endpoint permissions
      const endpoint = this.extractEndpoint(request.url);
      const isAllowed = await this.apiKeyService.isEndpointAllowed(apiKey, endpoint);
      
      if (!isAllowed) {
        throw new ForbiddenException('Endpoint not allowed for this API key');
      }

      // Check rate limiting
      const rateLimitResult = await this.rateLimitService.checkRateLimit(
        apiKey.id,
        endpoint,
        '1m',
        apiKey.rateLimit,
      );

      if (!rateLimitResult.allowed) {
        throw new ForbiddenException('Rate limit exceeded');
      }

      // Get API version
      const version = this.extractVersion(request.headers) || 'v1';
      const resolvedVersion = this.versioningService.resolveVersion(version, endpoint);

      // Transform request
      const transformedRequest = this.transformService.transformRequest(
        endpoint,
        request.method,
        request.body,
        request.headers,
      );

      // Apply version-specific transformations
      const versionedRequest = this.versioningService.transformRequestForVersion(
        resolvedVersion,
        endpoint,
        transformedRequest.data,
      );

      // Throttle request if needed
      const response = await this.throttleService.throttle(
        apiKey.id,
        this.getRequestPriority(request),
        async () => {
          return await this.routeRequest({
            ...request,
            body: versionedRequest,
            headers: transformedRequest.headers,
          });
        },
      );

      // Transform response
      const transformedResponse = this.transformService.transformResponse(
        endpoint,
        request.method,
        response.body,
        response.headers,
      );

      // Apply version-specific response transformations
      const versionedResponse = this.versioningService.transformResponseForVersion(
        resolvedVersion,
        endpoint,
        transformedResponse.data,
      );

      // Add version headers
      const finalHeaders = {
        ...transformedResponse.headers,
        ...this.versioningService.getVersionHeaders(resolvedVersion),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.resetAt.toISOString(),
      };

      const responseTime = Date.now() - startTime;

      // Track usage
      usageData = {
        apiKeyId: apiKey.id,
        endpoint,
        method: request.method,
        responseTime,
        statusCode: response.statusCode,
        status: RequestStatus.SUCCESS,
        userAgent: request.userAgent,
        ipAddress: request.ip,
        requestHeaders: request.headers,
        responseHeaders: finalHeaders,
        requestSize: JSON.stringify(request.body).length,
        responseSize: JSON.stringify(versionedResponse).length,
      };

      await this.analyticsService.trackUsage(usageData);
      await this.apiKeyService.incrementUsage(apiKey.id);

      return {
        statusCode: response.statusCode,
        headers: finalHeaders,
        body: versionedResponse,
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      // Track error usage
      if (apiKey) {
        usageData = {
          apiKeyId: apiKey.id,
          endpoint: this.extractEndpoint(request.url),
          method: request.method,
          responseTime,
          statusCode: error.status || 500,
          status: this.getErrorStatus(error),
          userAgent: request.userAgent,
          ipAddress: request.ip,
          requestHeaders: request.headers,
          errorMessage: error.message,
        };

        await this.analyticsService.trackUsage(usageData);
      }

      throw error;
    }
  }

  private async routeRequest(request: GatewayRequest): Promise<GatewayResponse> {
    const endpoint = this.extractEndpoint(request.url);
    const upstreamUrl = this.getUpstreamUrl(endpoint);

    if (!upstreamUrl) {
      throw new BadRequestException(`No upstream service configured for endpoint: ${endpoint}`);
    }

    // In a real implementation, this would make an HTTP request to the upstream service
    // For now, we'll simulate a response
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: {
        message: 'Request processed successfully',
        endpoint,
        upstream: upstreamUrl,
        timestamp: new Date().toISOString(),
      },
    };
  }

  private extractEndpoint(url: string): string {
    const urlObj = new URL(url, 'http://localhost');
    return urlObj.pathname;
  }

  private extractVersion(headers: Record<string, any>): string | null {
    return headers['x-api-version'] || headers['accept-version'] || null;
  }

  private getRequestPriority(request: GatewayRequest): number {
    // Higher priority for important endpoints
    const priorityEndpoints = ['/auth', '/certificates'];
    const endpoint = this.extractEndpoint(request.url);
    
    if (priorityEndpoints.includes(endpoint)) {
      return 10;
    }
    
    return 1;
  }

  private getUpstreamUrl(endpoint: string): string | null {
    for (const [pattern, url] of this.upstreamServices) {
      if (endpoint.startsWith(pattern)) {
        return url;
      }
    }
    return null;
  }

  private getErrorStatus(error: any): RequestStatus {
    if (error.message?.includes('Rate limit')) {
      return RequestStatus.RATE_LIMITED;
    }
    if (error.message?.includes('quota')) {
      return RequestStatus.QUOTA_EXCEEDED;
    }
    return RequestStatus.FAILED;
  }

  // Health check method
  async healthCheck(): Promise<{ status: string; services: Record<string, string> }> {
    const services: Record<string, string> = {};
    
    for (const [pattern, url] of this.upstreamServices) {
      try {
        // In a real implementation, this would check if the service is reachable
        services[pattern] = 'healthy';
      } catch (error) {
        services[pattern] = 'unhealthy';
      }
    }

    return {
      status: 'healthy',
      services,
    };
  }

  // Get gateway statistics
  async getStatistics(): Promise<any> {
    const queueStatuses = this.throttleService.getAllQueueStatuses();
    
    return {
      activeQueues: Object.keys(queueStatuses).length,
      queueStatuses,
      upstreamServices: Array.from(this.upstreamServices.entries()),
      supportedVersions: this.versioningService.getSupportedVersions(),
    };
  }
} 