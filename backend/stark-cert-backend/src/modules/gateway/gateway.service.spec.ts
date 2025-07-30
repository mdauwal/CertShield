import { Test, TestingModule } from '@nestjs/testing';
import { GatewayService } from './gateway.service';
import { ApiKeyService } from './services/api-key.service';
import { RateLimitService } from './services/rate-limit.service';
import { AnalyticsService } from './services/analytics.service';
import { ThrottleService } from './services/throttle.service';
import { TransformService } from './services/transform.service';
import { VersioningService } from './services/versioning.service';

describe('GatewayService', () => {
  let service: GatewayService;
  let apiKeyService: ApiKeyService;
  let rateLimitService: RateLimitService;
  let analyticsService: AnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GatewayService,
        {
          provide: ApiKeyService,
          useValue: {
            validateApiKey: jest.fn(),
            isEndpointAllowed: jest.fn(),
            incrementUsage: jest.fn(),
          },
        },
        {
          provide: RateLimitService,
          useValue: {
            checkRateLimit: jest.fn(),
          },
        },
        {
          provide: AnalyticsService,
          useValue: {
            trackUsage: jest.fn(),
          },
        },
        {
          provide: ThrottleService,
          useValue: {
            throttle: jest.fn(),
          },
        },
        {
          provide: TransformService,
          useValue: {
            transformRequest: jest.fn(),
            transformResponse: jest.fn(),
          },
        },
        {
          provide: VersioningService,
          useValue: {
            resolveVersion: jest.fn(),
            transformRequestForVersion: jest.fn(),
            transformResponseForVersion: jest.fn(),
            getVersionHeaders: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<GatewayService>(GatewayService);
    apiKeyService = module.get<ApiKeyService>(ApiKeyService);
    rateLimitService = module.get<RateLimitService>(RateLimitService);
    analyticsService = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('healthCheck', () => {
    it('should return health status', async () => {
      const result = await service.healthCheck();
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('services');
    });
  });

  describe('getStatistics', () => {
    it('should return gateway statistics', async () => {
      const result = await service.getStatistics();
      expect(result).toHaveProperty('activeQueues');
      expect(result).toHaveProperty('queueStatuses');
      expect(result).toHaveProperty('upstreamServices');
      expect(result).toHaveProperty('supportedVersions');
    });
  });

  describe('processRequest', () => {
    it('should throw error when API key is missing', async () => {
      const request = {
        method: 'GET',
        url: '/certificates',
        headers: {},
        ip: '127.0.0.1',
      };

      await expect(service.processRequest(request)).rejects.toThrow('API key is required');
    });

    it('should process valid request successfully', async () => {
      const mockApiKey = {
        id: 'test-id',
        key: 'test-key',
        rateLimit: 1000,
        status: 'active',
      };

      const request = {
        method: 'GET',
        url: '/certificates',
        headers: { 'x-api-key': 'test-key' },
        ip: '127.0.0.1',
      };

      jest.spyOn(apiKeyService, 'validateApiKey').mockResolvedValue(mockApiKey as any);
      jest.spyOn(apiKeyService, 'isEndpointAllowed').mockResolvedValue(true);
      jest.spyOn(rateLimitService, 'checkRateLimit').mockResolvedValue({
        allowed: true,
        remaining: 999,
        resetAt: new Date(),
      });

      const result = await service.processRequest(request);
      expect(result).toHaveProperty('statusCode');
      expect(result).toHaveProperty('headers');
      expect(result).toHaveProperty('body');
    });
  });
}); 