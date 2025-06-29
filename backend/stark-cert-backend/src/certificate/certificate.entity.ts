import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Template } from '../../templates/entities/template.entity';
import { CertificateStatus } from '../enums/certificate-status.enum';

@Entity('certificates')
export class Certificate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
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
    default: CertificateStatus.ACTIVE,
  })
  status: CertificateStatus;

  @Column({ nullable: true })
  blockchainHash: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @ManyToOne(() => User, user => user.certificates)
  // @JoinColumn({ name: 'recipientId' })
  recipient: User;

  @Column({ nullable: true })
  recipientId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'issuerId' })
  issuer: User;

  @Column()
  issuerId: string;

  @ManyToOne(() => Template)
  @JoinColumn({ name: 'templateId' })
  template: Template;

  @Column()
  templateId: string;

  @Column({ nullable: true }) // Allow null initially before PDF generation
  pdfPath: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}