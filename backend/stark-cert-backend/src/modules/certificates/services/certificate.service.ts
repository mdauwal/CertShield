import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between, In, FindOptionsWhere, Not } from 'typeorm';
import { Certificate } from '../entities/certificate.entity';
import { CreateCertificateDto } from '../dto/create-certificate.dto';
import { UpdateCertificateDto } from '../dto/update-certificate.dto';
import { SearchCertificateDto } from '../dto/search-certificate.dto';
import { BatchCertificateDto, BatchCertificateResponseDto } from '../dto/batch-certificate.dto';
import { BlockchainService } from './blockchain.service';
import { CertificateStatus } from '../enums/certificate-status.enum';
import { CertificateType } from '../enums/certificate-type.enum';

@Injectable()
export class CertificateService {
  private readonly logger = new Logger(CertificateService.name);

  constructor(
    @InjectRepository(Certificate)
    private certificateRepository: Repository<Certificate>,
    private readonly blockchainService: BlockchainService,
  ) {}

  async create(createCertificateDto: CreateCertificateDto): Promise<Certificate> {
    try {
      this.logger.log(`Creating certificate: ${JSON.stringify(createCertificateDto)}`);

      // Generate unique serial number
      const serialNumber = this.generateSerialNumber();

      // Create certificate entity
      const certificate = this.certificateRepository.create({
        ...createCertificateDto,
        serialNumber,
        status: CertificateStatus.PENDING,
      });

      // Save to database
      const savedCertificate = await this.certificateRepository.save(certificate);

      // Issue on blockchain
      try {
        const blockchainData = await this.blockchainService.issueCertificate(
          this.blockchainService.convertToBlockchainFormat(savedCertificate)
        );

        // Update certificate with blockchain data
        await this.certificateRepository.update(savedCertificate.id, {
          blockchainHash: blockchainData.transactionHash,
          blockchainTransactionHash: blockchainData.transactionHash,
          blockchainCertificateId: blockchainData.certificateId.toString(),
          blockchainMetadata: blockchainData.metadata,
          status: CertificateStatus.ACTIVE,
        });

        // Return updated certificate
        return this.findOne(savedCertificate.id);
      } catch (blockchainError) {
        this.logger.error(`Blockchain issuance failed: ${blockchainError.message}`);
        // Certificate is saved but blockchain issuance failed
        await this.certificateRepository.update(savedCertificate.id, {
          status: CertificateStatus.FAILED,
        });
        throw new BadRequestException('Certificate created but blockchain issuance failed');
      }
    } catch (error) {
      this.logger.error(`Failed to create certificate: ${error.message}`);
      throw error;
    }
  }

  async findAll(searchDto: SearchCertificateDto): Promise<{ certificates: Certificate[]; total: number }> {
    try {
      const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'DESC', ...filters } = searchDto;

      // Build where conditions
      const whereConditions: FindOptionsWhere<Certificate> = {};

      if (filters.status) {
        whereConditions.status = filters.status;
      }

      if (filters.type) {
        whereConditions.type = filters.type;
      }

      if (filters.issuerId) {
        whereConditions.issuerId = filters.issuerId;
      }

      if (filters.recipientId) {
        whereConditions.recipientId = filters.recipientId;
      }

      if (filters.recipientEmail) {
        whereConditions.recipientEmail = filters.recipientEmail;
      }

      if (filters.templateId) {
        whereConditions.templateId = filters.templateId;
      }

      if (filters.batchId) {
        whereConditions.batchId = filters.batchId;
      }

      // Build query with search
      let query = this.certificateRepository.createQueryBuilder('certificate');

      if (filters.search) {
        query = query.where(
          '(certificate.title LIKE :search OR certificate.description LIKE :search OR certificate.recipientName LIKE :search)',
          { search: `%${filters.search}%` }
        );
      }

      // Add date filters
      if (filters.issueDateFrom || filters.issueDateTo) {
        const dateConditions: any = {};
        if (filters.issueDateFrom) {
          dateConditions.issueDateFrom = new Date(filters.issueDateFrom);
        }
        if (filters.issueDateTo) {
          dateConditions.issueDateTo = new Date(filters.issueDateTo);
        }
        query = query.andWhere('certificate.issueDate BETWEEN :issueDateFrom AND :issueDateTo', dateConditions);
      }

      if (filters.expiryDateFrom || filters.expiryDateTo) {
        const dateConditions: any = {};
        if (filters.expiryDateFrom) {
          dateConditions.expiryDateFrom = new Date(filters.expiryDateFrom);
        }
        if (filters.expiryDateTo) {
          dateConditions.expiryDateTo = new Date(filters.expiryDateTo);
        }
        query = query.andWhere('certificate.expiryDate BETWEEN :expiryDateFrom AND :expiryDateTo', dateConditions);
      }

      // Add blockchain verification filter
      if (filters.blockchainVerified === 'true') {
        query = query.andWhere('certificate.blockchainHash IS NOT NULL');
      } else if (filters.blockchainVerified === 'false') {
        query = query.andWhere('certificate.blockchainHash IS NULL');
      }

      // Add where conditions
      Object.keys(whereConditions).forEach(key => {
        query = query.andWhere(`certificate.${key} = :${key}`, { [key]: whereConditions[key] });
      });

      // Add sorting
      query = query.orderBy(`certificate.${sortBy}`, sortOrder);

      // Add pagination
      const skip = (page - 1) * limit;
      query = query.skip(skip).take(limit);

      // Execute query
      const [certificates, total] = await query.getManyAndCount();

      return { certificates, total };
    } catch (error) {
      this.logger.error(`Failed to find certificates: ${error.message}`);
      throw error;
    }
  }

  async findOne(id: string): Promise<Certificate> {
    try {
      const certificate = await this.certificateRepository.findOne({ where: { id } });
      if (!certificate) {
        throw new NotFoundException(`Certificate with ID ${id} not found`);
      }
      return certificate;
    } catch (error) {
      this.logger.error(`Failed to find certificate ${id}: ${error.message}`);
      throw error;
    }
  }

  async findBySerialNumber(serialNumber: string): Promise<Certificate> {
    try {
      const certificate = await this.certificateRepository.findOne({ where: { serialNumber } });
      if (!certificate) {
        throw new NotFoundException(`Certificate with serial number ${serialNumber} not found`);
      }
      return certificate;
    } catch (error) {
      this.logger.error(`Failed to find certificate by serial number ${serialNumber}: ${error.message}`);
      throw error;
    }
  }

  async update(id: string, updateCertificateDto: UpdateCertificateDto): Promise<Certificate> {
    try {
      const certificate = await this.findOne(id);

      // If status is being changed to REVOKED, revoke on blockchain
      if (updateCertificateDto.status === CertificateStatus.REVOKED && certificate.status !== CertificateStatus.REVOKED) {
        try {
          const blockchainTransaction = await this.blockchainService.revokeCertificate(
            parseInt(certificate.blockchainCertificateId || '0')
          );

          updateCertificateDto.blockchainTransactionHash = blockchainTransaction.transactionHash;
          updateCertificateDto.revokedAt = new Date();
        } catch (blockchainError) {
          this.logger.error(`Blockchain revocation failed: ${blockchainError.message}`);
          throw new BadRequestException('Failed to revoke certificate on blockchain');
        }
      }

      await this.certificateRepository.update(id, updateCertificateDto);
      return this.findOne(id);
    } catch (error) {
      this.logger.error(`Failed to update certificate ${id}: ${error.message}`);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const certificate = await this.findOne(id);
      await this.certificateRepository.remove(certificate);
      this.logger.log(`Certificate ${id} removed successfully`);
    } catch (error) {
      this.logger.error(`Failed to remove certificate ${id}: ${error.message}`);
      throw error;
    }
  }

  async processBatch(batchDto: BatchCertificateDto): Promise<BatchCertificateResponseDto> {
    try {
      this.logger.log(`Processing batch of ${batchDto.certificates.length} certificates`);

      const batchId = batchDto.batchId || this.generateBatchId();
      const certificateIds: string[] = [];
      const errors: any[] = [];
      let successfulCount = 0;
      let failedCount = 0;

      for (let i = 0; i < batchDto.certificates.length; i++) {
        try {
          const certificateData = batchDto.certificates[i];
          const certificate = await this.create(certificateData);
          certificateIds.push(certificate.id);
          successfulCount++;
        } catch (error) {
          failedCount++;
          errors.push({
            index: i,
            error: error.message,
            certificateData: batchDto.certificates[i],
          });
        }
      }

      // Update batch data for successful certificates
      if (certificateIds.length > 0) {
        await this.certificateRepository.update(
          { id: In(certificateIds) },
          {
            batchId,
            isBatchProcessed: true,
            batchData: batchDto.batchMetadata,
          }
        );
      }

      const response: BatchCertificateResponseDto = {
        batchId,
        totalCertificates: batchDto.certificates.length,
        successfulCertificates: successfulCount,
        failedCertificates: failedCount,
        certificateIds,
        errors,
      };

      this.logger.log(`Batch processing completed: ${JSON.stringify(response)}`);
      return response;
    } catch (error) {
      this.logger.error(`Failed to process batch: ${error.message}`);
      throw error;
    }
  }

  async verifyCertificate(id: string): Promise<any> {
    try {
      const certificate = await this.findOne(id);
      
      if (!certificate.blockchainCertificateId) {
        throw new BadRequestException('Certificate not issued on blockchain');
      }

      const verificationResult = await this.blockchainService.verifyCertificate(
        parseInt(certificate.blockchainCertificateId)
      );

      // Update verification data
      await this.certificateRepository.update(id, {
        verificationData: {
          isValid: verificationResult.isValid,
          verificationDate: verificationResult.verificationDate,
          error: verificationResult.error,
        },
      });

      return {
        certificateId: id,
        serialNumber: certificate.serialNumber,
        blockchainHash: certificate.blockchainHash,
        isValid: verificationResult.isValid,
        verificationDate: verificationResult.verificationDate,
        error: verificationResult.error,
      };
    } catch (error) {
      this.logger.error(`Failed to verify certificate ${id}: ${error.message}`);
      throw error;
    }
  }

  async getCertificateStats(): Promise<any> {
    try {
      const [
        totalCertificates,
        activeCertificates,
        expiredCertificates,
        revokedCertificates,
        pendingCertificates,
      ] = await Promise.all([
        this.certificateRepository.count(),
        this.certificateRepository.count({ where: { status: CertificateStatus.ACTIVE } }),
        this.certificateRepository.count({ where: { status: CertificateStatus.EXPIRED } }),
        this.certificateRepository.count({ where: { status: CertificateStatus.REVOKED } }),
        this.certificateRepository.count({ where: { status: CertificateStatus.PENDING } }),
      ]);

      return {
        totalCertificates,
        activeCertificates,
        expiredCertificates,
        revokedCertificates,
        pendingCertificates,
        blockchainVerified: await this.certificateRepository.count({ where: { blockchainHash: Not(null) } }),
      };
    } catch (error) {
      this.logger.error(`Failed to get certificate stats: ${error.message}`);
      throw error;
    }
  }

  private generateSerialNumber(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `CERT-${timestamp}-${random}`.toUpperCase();
  }

  private generateBatchId(): string {
    return `BATCH-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase();
  }
} 