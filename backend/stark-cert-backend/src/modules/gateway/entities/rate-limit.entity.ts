import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('rate_limits')
export class RateLimit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  identifier: string; // API key or IP address

  @Column()
  endpoint: string;

  @Column()
  window: string; // Time window (e.g., '1m', '1h', '1d')

  @Column({ type: 'int' })
  limit: number;

  @Column({ type: 'int', default: 0 })
  current: number;

  @Column({ type: 'timestamp' })
  resetAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastRequestAt: Date;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 