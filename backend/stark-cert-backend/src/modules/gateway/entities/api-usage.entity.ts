import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ApiKey } from './api-key.entity';

export enum RequestStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  RATE_LIMITED = 'rate_limited',
  QUOTA_EXCEEDED = 'quota_exceeded',
}

@Entity('api_usages')
export class ApiUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  apiKeyId: string;

  @Column()
  endpoint: string;

  @Column()
  method: string;

  @Column({ type: 'int' })
  responseTime: number;

  @Column({ type: 'int' })
  statusCode: number;

  @Column({
    type: 'enum',
    enum: RequestStatus,
    default: RequestStatus.SUCCESS,
  })
  status: RequestStatus;

  @Column({ type: 'text', nullable: true })
  userAgent: string;

  @Column({ type: 'inet', nullable: true })
  ipAddress: string;

  @Column({ type: 'json', nullable: true })
  requestHeaders: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  responseHeaders: Record<string, any>;

  @Column({ type: 'int', default: 0 })
  requestSize: number;

  @Column({ type: 'int', default: 0 })
  responseSize: number;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => ApiKey, (apiKey) => apiKey.usages)
  @JoinColumn({ name: 'apiKeyId' })
  apiKey: ApiKey;
} 