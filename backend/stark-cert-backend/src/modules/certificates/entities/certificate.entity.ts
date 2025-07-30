import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { CertificateStatus } from '../enums/certificate-status.enum';
import { CertificateType } from '../enums/certificate-type.enum';

@Entity('certificates')
@Index(['serialNumber'], { unique: true })
@Index(['blockchainHash'], { unique: true })
@Index(['recipientEmail'])
@Index(['issuerId', 'status'])
@Index(['issueDate'])
export class Certificate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column()
  issuerName: string;

  @Column()
  recipientName: string;

  @Column()
  recipientEmail: string;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ type: 'date' })
  issueDate: Date;

  @Column({ type: 'date', nullable: true })
  expiryDate: Date;

  @Column({ unique: true })
  serialNumber: string;

  @Column({
    type: 'enum',
    enum: CertificateStatus,
    default: CertificateStatus.PENDING,
  })
  status: CertificateStatus;

  @Column({
    type: 'enum',
    enum: CertificateType,
    default: CertificateType.ACHIEVEMENT,
  })
  type: CertificateType;

  @Column({ nullable: true })
  blockchainHash: string;

  @Column({ nullable: true })
  blockchainTransactionHash: string;

  @Column({ nullable: true })
  blockchainCertificateId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  blockchainMetadata: Record<string, any>;

  @Column({ nullable: true })
  pdfPath: string;

  @Column({ nullable: true })
  templatePath: string;

  @Column({ type: 'simple-array', nullable: true })
  assetUrls: string[];

  @Column({ type: 'jsonb', nullable: true })
  verificationData: Record<string, any>;

  @Column({ nullable: true })
  revocationReason: string;

  @Column({ nullable: true })
  revokedAt: Date;

  @Column({ nullable: true })
  revokedBy: string;

  @Column({ type: 'jsonb', nullable: true })
  batchData: Record<string, any>;

  @Column({ default: false })
  isBatchProcessed: boolean;

  @Column({ nullable: true })
  batchId: string;

  @Column({ nullable: true })
  recipientId: string;

  @Column()
  issuerId: string;

  @Column()
  templateId: string;

  @Column({ nullable: true })
  customTemplateData: string;

  @Column({ type: 'jsonb', nullable: true })
  searchIndex: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual properties for blockchain integration
  get isExpired(): boolean {
    if (!this.expiryDate) return false;
    return new Date() > this.expiryDate;
  }

  get isRevoked(): boolean {
    return this.status === CertificateStatus.REVOKED;
  }

  get isActive(): boolean {
    return this.status === CertificateStatus.ACTIVE && !this.isExpired;
  }

  get blockchainVerified(): boolean {
    return !!this.blockchainHash && !!this.blockchainTransactionHash;
  }

  get verificationUrl(): string {
    return `/certificates/${this.id}/verify`;
  }

  get qrCodeData(): string {
    return JSON.stringify({
      id: this.id,
      serialNumber: this.serialNumber,
      blockchainHash: this.blockchainHash,
      verificationUrl: this.verificationUrl,
    });
  }
} 