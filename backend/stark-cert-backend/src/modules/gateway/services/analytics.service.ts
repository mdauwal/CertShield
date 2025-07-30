import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ApiUsage, RequestStatus } from '../entities/api-usage.entity';
import { AnalyticsQueryDto, UsageStatsDto } from '../dto/analytics.dto';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(ApiUsage)
    private apiUsageRepository: Repository<ApiUsage>,
  ) {}

  async trackUsage(usageData: Partial<ApiUsage>): Promise<ApiUsage> {
    const usage = this.apiUsageRepository.create(usageData);
    return this.apiUsageRepository.save(usage);
  }

  async getUsageStats(query: AnalyticsQueryDto): Promise<UsageStatsDto> {
    const where: any = {};

    if (query.apiKeyId) {
      where.apiKeyId = query.apiKeyId;
    }

    if (query.endpoint) {
      where.endpoint = query.endpoint;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.startDate && query.endDate) {
      where.createdAt = Between(new Date(query.startDate), new Date(query.endDate));
    }

    const [usages, totalRequests] = await Promise.all([
      this.apiUsageRepository.find({ where }),
      this.apiUsageRepository.count({ where }),
    ]);

    const successfulRequests = usages.filter(u => u.status === RequestStatus.SUCCESS).length;
    const failedRequests = usages.filter(u => u.status === RequestStatus.FAILED).length;
    const rateLimitedRequests = usages.filter(u => u.status === RequestStatus.RATE_LIMITED).length;

    const averageResponseTime = usages.length > 0
      ? usages.reduce((sum, usage) => sum + usage.responseTime, 0) / usages.length
      : 0;

    const totalDataTransferred = usages.reduce((sum, usage) => sum + usage.requestSize + usage.responseSize, 0);

    const endpointCounts = usages.reduce((acc, usage) => {
      acc[usage.endpoint] = (acc[usage.endpoint] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topEndpoints = Object.entries(endpointCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([endpoint, count]) => ({ endpoint, count }));

    const uniqueEndpoints = Object.keys(endpointCounts).length;

    const requestsByStatus = {
      [RequestStatus.SUCCESS]: successfulRequests,
      [RequestStatus.FAILED]: failedRequests,
      [RequestStatus.RATE_LIMITED]: rateLimitedRequests,
      [RequestStatus.QUOTA_EXCEEDED]: usages.filter(u => u.status === RequestStatus.QUOTA_EXCEEDED).length,
    };

    const requestsByHour = this.groupByHour(usages);

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      rateLimitedRequests,
      averageResponseTime,
      totalDataTransferred,
      uniqueEndpoints,
      topEndpoints,
      requestsByStatus,
      requestsByHour,
    };
  }

  async getEndpointAnalytics(endpoint: string, days: number = 30): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const usages = await this.apiUsageRepository.find({
      where: {
        endpoint,
        createdAt: Between(startDate, new Date()),
      },
      order: { createdAt: 'ASC' },
    });

    return {
      endpoint,
      totalRequests: usages.length,
      averageResponseTime: usages.length > 0
        ? usages.reduce((sum, usage) => sum + usage.responseTime, 0) / usages.length
        : 0,
      successRate: usages.length > 0
        ? (usages.filter(u => u.status === RequestStatus.SUCCESS).length / usages.length) * 100
        : 0,
      requestsByDay: this.groupByDay(usages),
    };
  }

  async getApiKeyAnalytics(apiKeyId: string, days: number = 30): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const usages = await this.apiUsageRepository.find({
      where: {
        apiKeyId,
        createdAt: Between(startDate, new Date()),
      },
      order: { createdAt: 'ASC' },
    });

    return {
      apiKeyId,
      totalRequests: usages.length,
      uniqueEndpoints: new Set(usages.map(u => u.endpoint)).size,
      averageResponseTime: usages.length > 0
        ? usages.reduce((sum, usage) => sum + usage.responseTime, 0) / usages.length
        : 0,
      requestsByEndpoint: this.groupByEndpoint(usages),
      requestsByDay: this.groupByDay(usages),
    };
  }

  private groupByHour(usages: ApiUsage[]): Array<{ hour: string; count: number }> {
    const hourCounts: Record<string, number> = {};
    
    usages.forEach(usage => {
      const hour = new Date(usage.createdAt).toISOString().slice(0, 13) + ':00';
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    return Object.entries(hourCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([hour, count]) => ({ hour, count }));
  }

  private groupByDay(usages: ApiUsage[]): Array<{ day: string; count: number }> {
    const dayCounts: Record<string, number> = {};
    
    usages.forEach(usage => {
      const day = new Date(usage.createdAt).toISOString().slice(0, 10);
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });

    return Object.entries(dayCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, count]) => ({ day, count }));
  }

  private groupByEndpoint(usages: ApiUsage[]): Array<{ endpoint: string; count: number }> {
    const endpointCounts: Record<string, number> = {};
    
    usages.forEach(usage => {
      endpointCounts[usage.endpoint] = (endpointCounts[usage.endpoint] || 0) + 1;
    });

    return Object.entries(endpointCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([endpoint, count]) => ({ endpoint, count }));
  }

  async cleanupOldUsageData(daysToKeep: number = 90): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    await this.apiUsageRepository.delete({
      createdAt: { $lt: cutoffDate } as any,
    });
  }
} 