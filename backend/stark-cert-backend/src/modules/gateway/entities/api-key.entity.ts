import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ApiUsage } from './api-usage.entity';

export enum ApiKeyTier {
  FREE = 'free',
  BASIC = 'basic',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
}

export enum ApiKeyStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  key: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ApiKeyTier,
    default: ApiKeyTier.FREE,
  })
  tier: ApiKeyTier;

  @Column({
    type: 'enum',
    enum: ApiKeyStatus,
    default: ApiKeyStatus.ACTIVE,
  })
  status: ApiKeyStatus;

  @Column({ type: 'int', default: 1000 })
  rateLimit: number;

  @Column({ type: 'int', default: 10000 })
  monthlyQuota: number;

  @Column({ type: 'int', default: 0 })
  usedQuota: number;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ type: 'simple-array', nullable: true })
  allowedEndpoints: string[];

  @Column({ type: 'simple-array', nullable: true })
  blockedEndpoints: string[];

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => ApiUsage, (usage) => usage.apiKey)
  usages: ApiUsage[];
} 