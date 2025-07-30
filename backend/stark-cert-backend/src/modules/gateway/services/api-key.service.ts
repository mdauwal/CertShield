import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey, ApiKeyStatus } from '../entities/api-key.entity';
import { CreateApiKeyDto } from '../dto/create-api-key.dto';
import { UpdateApiKeyDto } from '../dto/update-api-key.dto';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeyService {
  constructor(
    @InjectRepository(ApiKey)
    private apiKeyRepository: Repository<ApiKey>,
  ) {}

  async createApiKey(createApiKeyDto: CreateApiKeyDto): Promise<ApiKey> {
    const apiKey = new ApiKey();
    Object.assign(apiKey, createApiKeyDto);
    
    // Generate a secure API key
    apiKey.key = this.generateApiKey();
    
    return this.apiKeyRepository.save(apiKey);
  }

  async findAll(): Promise<ApiKey[]> {
    return this.apiKeyRepository.find({
      relations: ['usages'],
    });
  }

  async findOne(id: string): Promise<ApiKey> {
    const apiKey = await this.apiKeyRepository.findOne({
      where: { id },
      relations: ['usages'],
    });

    if (!apiKey) {
      throw new NotFoundException(`API key with ID ${id} not found`);
    }

    return apiKey;
  }

  async findByKey(key: string): Promise<ApiKey> {
    const apiKey = await this.apiKeyRepository.findOne({
      where: { key },
      relations: ['usages'],
    });

    if (!apiKey) {
      throw new NotFoundException('Invalid API key');
    }

    return apiKey;
  }

  async update(id: string, updateApiKeyDto: UpdateApiKeyDto): Promise<ApiKey> {
    const apiKey = await this.findOne(id);
    Object.assign(apiKey, updateApiKeyDto);
    return this.apiKeyRepository.save(apiKey);
  }

  async remove(id: string): Promise<void> {
    const apiKey = await this.findOne(id);
    await this.apiKeyRepository.remove(apiKey);
  }

  async validateApiKey(key: string): Promise<ApiKey> {
    const apiKey = await this.findByKey(key);

    if (apiKey.status !== ApiKeyStatus.ACTIVE) {
      throw new BadRequestException('API key is not active');
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      throw new BadRequestException('API key has expired');
    }

    if (apiKey.usedQuota >= apiKey.monthlyQuota) {
      throw new BadRequestException('Monthly quota exceeded');
    }

    return apiKey;
  }

  async incrementUsage(id: string): Promise<void> {
    await this.apiKeyRepository.increment({ id }, 'usedQuota', 1);
  }

  async resetMonthlyQuota(): Promise<void> {
    await this.apiKeyRepository.update({}, { usedQuota: 0 });
  }

  private generateApiKey(): string {
    // Generate a secure API key with prefix
    const randomBytes = crypto.randomBytes(32);
    const apiKey = `sk_${randomBytes.toString('hex')}`;
    return apiKey;
  }

  async isEndpointAllowed(apiKey: ApiKey, endpoint: string): Promise<boolean> {
    // Check if endpoint is blocked
    if (apiKey.blockedEndpoints?.includes(endpoint)) {
      return false;
    }

    // Check if endpoint is explicitly allowed (if allowedEndpoints is set)
    if (apiKey.allowedEndpoints && apiKey.allowedEndpoints.length > 0) {
      return apiKey.allowedEndpoints.includes(endpoint);
    }

    // If no restrictions, allow all endpoints
    return true;
  }
} 