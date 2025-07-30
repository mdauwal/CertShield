import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RateLimit } from '../entities/rate-limit.entity';

@Injectable()
export class RateLimitService {
  constructor(
    @InjectRepository(RateLimit)
    private rateLimitRepository: Repository<RateLimit>,
  ) {}

  async checkRateLimit(
    identifier: string,
    endpoint: string,
    window: string = '1m',
    limit: number = 100,
  ): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    const now = new Date();
    const resetAt = this.calculateResetTime(window);

    let rateLimit = await this.rateLimitRepository.findOne({
      where: { identifier, endpoint, window },
    });

    if (!rateLimit) {
      rateLimit = this.rateLimitRepository.create({
        identifier,
        endpoint,
        window,
        limit,
        current: 0,
        resetAt,
      });
    }

    // Check if window has reset
    if (now >= rateLimit.resetAt) {
      rateLimit.current = 0;
      rateLimit.resetAt = resetAt;
    }

    // Check if limit exceeded
    if (rateLimit.current >= rateLimit.limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: rateLimit.resetAt,
      };
    }

    // Increment counter
    rateLimit.current += 1;
    rateLimit.lastRequestAt = now;
    await this.rateLimitRepository.save(rateLimit);

    return {
      allowed: true,
      remaining: rateLimit.limit - rateLimit.current,
      resetAt: rateLimit.resetAt,
    };
  }

  async getRateLimitInfo(
    identifier: string,
    endpoint: string,
    window: string = '1m',
  ): Promise<RateLimit | null> {
    return this.rateLimitRepository.findOne({
      where: { identifier, endpoint, window },
    });
  }

  async resetRateLimit(
    identifier: string,
    endpoint: string,
    window: string = '1m',
  ): Promise<void> {
    await this.rateLimitRepository.delete({
      identifier,
      endpoint,
      window,
    });
  }

  async updateRateLimit(
    identifier: string,
    endpoint: string,
    window: string,
    limit: number,
  ): Promise<RateLimit> {
    let rateLimit = await this.rateLimitRepository.findOne({
      where: { identifier, endpoint, window },
    });

    if (!rateLimit) {
      rateLimit = this.rateLimitRepository.create({
        identifier,
        endpoint,
        window,
        limit,
        current: 0,
        resetAt: this.calculateResetTime(window),
      });
    } else {
      rateLimit.limit = limit;
    }

    return this.rateLimitRepository.save(rateLimit);
  }

  private calculateResetTime(window: string): Date {
    const now = new Date();
    const [value, unit] = this.parseWindow(window);
    
    switch (unit) {
      case 's':
        return new Date(now.getTime() + value * 1000);
      case 'm':
        return new Date(now.getTime() + value * 60 * 1000);
      case 'h':
        return new Date(now.getTime() + value * 60 * 60 * 1000);
      case 'd':
        return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
      default:
        throw new BadRequestException(`Invalid window format: ${window}`);
    }
  }

  private parseWindow(window: string): [number, string] {
    const match = window.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new BadRequestException(`Invalid window format: ${window}`);
    }
    return [parseInt(match[1]), match[2]];
  }

  async cleanupExpiredRateLimits(): Promise<void> {
    const now = new Date();
    await this.rateLimitRepository.delete({
      resetAt: { $lt: now } as any,
    });
  }
} 