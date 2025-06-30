import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Certificate } from './entities/certificate.entity';
import { CreateCertificateDto } from './dto/create-certificate.dto';
import { UpdateCertificateDto } from './dto/update-certificate.dto';
import { UsersService } from '../users/users.service';
import { TemplatesService } from '../templates/templates.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { CertificateStatus } from '../certificates/enums/certificate-status.enum';
import { v4 as uuidv4 } from 'uuid';
// import QRCode from 'qrcode';
import * as QRCode from 'qrcode';
import * as PDFDocument from 'pdfkit';

// import fs from 'fs';
import * as fs from 'fs';
// import path from 'path';
import * as path from 'path';

import { Template } from '../templates/entities/template.entity';

@Injectable()
export class CertificatesService {
  constructor(
    @InjectRepository(Certificate)
    private certificatesRepository: Repository<Certificate>,
    private usersService: UsersService,
    private templatesService: TemplatesService,
    private blockchainService: BlockchainService,
  ) {}

  async findAll(): Promise<{ certificates: Certificate[], total: number }> {
    const [certificates, total] = await this.certificatesRepository.findAndCount({
      relations: ['recipient', 'issuer', 'template'],
    });
    
    return { certificates, total };
  }

  async findByRecipient(recipientId: string): Promise<Certificate[]> {
    return this.certificatesRepository.find({
      where: { recipientId },
      relations: ['issuer', 'template'],
    });
  }

  async findByIssuer(issuerId: string): Promise<Certificate[]> {
    return this.certificatesRepository.find({
      where: { issuerId },
      relations: ['recipient', 'template'],
    });
  }

  async findOne(id: string): Promise<Certificate> {
    const certificate = await this.certificatesRepository.findOne({
      where: { id },
      relations: ['recipient', 'issuer', 'template'],
    });
    
    if (!certificate) {
      throw new NotFoundException(`Certificate with ID ${id} not found`);
    }
    
    return certificate;
  }

  async findBySerialNumber(serialNumber: string): Promise<Certificate> {
    const certificate = await this.certificatesRepository.findOne({
      where: { serialNumber },
      relations: ['recipient', 'issuer', 'template'],
    });
    
    if (!certificate) {
      throw new NotFoundException(`Certificate with serial number ${serialNumber} not found`);
    }
    
    return certificate;
  }

  async create(createCertificateDto: CreateCertificateDto): Promise<Certificate> {
    const issuer = await this.usersService.findOne(createCertificateDto.issuerId);
    const template = await this.templatesService.findOne(createCertificateDto.templateId);
    let recipient = null;
    
    // Find or create recipient
    if (createCertificateDto.recipientId) {
      recipient = await this.usersService.findOne(createCertificateDto.recipientId);
    }
    
    // Generate a unique serial number
    const serialNumber = uuidv4();
    
    // Create certificate in database
    const certificate = this.certificatesRepository.create({
      ...createCertificateDto,
      serialNumber,
      status: CertificateStatus.ACTIVE,
    });
    
    // Store in blockchain if enabled
    if (process.env.BLOCKCHAIN_ENABLED === 'true') {
      const blockchainHash = await this.blockchainService.storeCertificate({
        serialNumber,
        title: certificate.title,
        recipientName: certificate.recipientName,
        recipientEmail: certificate.recipientEmail,
        issuerName: certificate.issuerName,
        issueDate: certificate.issueDate,
        expiryDate: certificate.expiryDate,
      });
      
      certificate.blockchainHash = blockchainHash;
    }
    
    // Generate certificate PDF and QR code
    await this.generateCertificatePDF(certificate, template);
    
    return this.certificatesRepository.save(certificate);
  }
  

  async update(id: string, updateCertificateDto: UpdateCertificateDto): Promise<Certificate> {
    const certificate = await this.findOne(id);
    
    Object.assign(certificate, updateCertificateDto);
    
    // Update blockchain record if enabled and status changed to revoked
    if (
      process.env.BLOCKCHAIN_ENABLED === 'true' && 
      updateCertificateDto.status === CertificateStatus.REVOKED
    ) {
      await this.blockchainService.updateCertificateStatus(
        certificate.serialNumber, 
        CertificateStatus.REVOKED
      );
    }
    
    return this.certificatesRepository.save(certificate);
  }

  // async revoke(id: string, reason: string): Promise<Certificate> {
  //   const certificate = await this.findOne(id);
    
  //   certificate.status = CertificateStatus.REVOKED;
  //   certificate.metadata = {
  //     ...certificate.metadata,
  //     revocationReason: reason,
  //     revokedAt: new Date().toISOString(),
  //   };
    
  //   // Update blockchain record if enabled
  //   if (process.env.BLOCKCHAIN_ENABLED === 'true') {
  //     await this.blockchainService.updateCertificateStatus(
  //       certificate.serialNumber, 
  //       CertificateStatus.REVOKED
  //     );
  //   }
    
  //   return this.certificatesRepository.save(certificate);
  // }


  // async revoke(id: string, reason: string): Promise<Certificate> {
  //   const certificate = await this.findOne(id);

  //   console.log("<<<<<<<<<<<<<<<<<<<<<certificate>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>",certificate);
    
    
  //   certificate.status = CertificateStatus.REVOKED;
    
  //   // Initialize metadata if it doesn't exist
  //   if (!certificate.metadata) {
  //     certificate.metadata = {};
  //   }
    
  //   certificate.metadata = {
  //     ...certificate.metadata,
  //     revocationReason: reason,
  //     revokedAt: new Date().toISOString(),
  //   };
    
  //   // Update blockchain record if enabled
  //   if (process.env.BLOCKCHAIN_ENABLED === 'true') {
  //     try {
  //       await this.blockchainService.updateCertificateStatus(
  //         certificate.serialNumber, 
  //         CertificateStatus.REVOKED
  //       );
  //     } catch (error) {
  //       console.error('Blockchain update failed:', error);
  //       // Decide how to handle this - throw an error or continue?
  //     }
  //   }
    
  //   try {
  //     return await this.certificatesRepository.save(certificate);
  //   } catch (error) {
  //     console.error('Certificate save failed:', error);
  //     throw error; // Re-throw or handle as needed
  //   }
  // }

  async revoke(id: string, reason: string): Promise<Certificate | null> {
    try {
      const certificate = await this.findOne(id);
  
      certificate.status = CertificateStatus.REVOKED;
  
      // Initialize metadata if it doesn't exist
      if (!certificate.metadata) {
        certificate.metadata = {};
      }
  
      certificate.metadata = {
        ...certificate.metadata,
        revocationReason: reason,
        revokedAt: new Date().toISOString(),
      };
  
      // Update blockchain record if enabled
      if (process.env.BLOCKCHAIN_ENABLED === 'true') {
        try {
          await this.blockchainService.updateCertificateStatus(
            certificate.serialNumber,
            CertificateStatus.REVOKED
          );
        } catch (error) {
          console.error('Blockchain update failed:', error);
        }
      }
  
      return await this.certificatesRepository.save(certificate);
    } catch (error) {
      if (error instanceof NotFoundException) {
        console.error(`Certificate not found: ${id}`);
        throw new NotFoundException(`Certificate with ID ${id} not found`);
      }
      
      console.error('Unexpected error during revocation:', error);
      throw new InternalServerErrorException('An error occurred while revoking the certificate');
    }
  }
  

  async batchCreate(createCertificateDtos: CreateCertificateDto[]): Promise<Certificate[]> {
    const certificates = [];
    
    for (const dto of createCertificateDtos) {
      const certificate = await this.create(dto);
      certificates.push(certificate);
    }
    
    return certificates;
  }

  private async generateCertificatePDF(certificate: Certificate, template: Template): Promise<void> {
    try {
      // Create directories if they don't exist
      const publicDir = path.join(process.cwd(), 'public');
      const certificatesDir = path.join(publicDir, 'certificates');
      const qrCodesDir = path.join(publicDir, 'qrcodes');
      
      if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);
      if (!fs.existsSync(certificatesDir)) fs.mkdirSync(certificatesDir);
      if (!fs.existsSync(qrCodesDir)) fs.mkdirSync(qrCodesDir);
      
      // Generate QR code for verification
      // const verificationUrl = `${process.env.FRONTEND_URL}/verify/${certificate.serialNumber}`; 
      const verificationUrl = `${process.env.FRONTEND_URL}/verify?serial=${certificate.serialNumber}`;
      const qrCodePath = path.join(qrCodesDir, `${certificate.serialNumber}.png`);
      
      await QRCode.toFile(qrCodePath, verificationUrl, {
        width: 200,
        margin: 1,
        errorCorrectionLevel: 'H', // High error correction for better scanning
      });
      
      // Create PDF certificate
      const pdfPath = path.join(certificatesDir, `${certificate.title} for ${certificate.recipientName} SId ${certificate.serialNumber}.pdf`);
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: certificate.title,
          Author: certificate.issuerName,
          Subject: 'Digital Certificate',
          Keywords: 'certificate,verification,blockchain',
          CreationDate: new Date(),
        }
      });
      
      // Set up writable stream with proper error handling
      const stream = fs.createWriteStream(pdfPath);
      stream.on('error', (err) => {
        throw new Error(`Error writing PDF file: ${err.message}`);
      });
      
      doc.pipe(stream);
      
      // Page dimensions
      const pageWidth = doc.page.width - 2 * 50; // Account for margins
      
      // Apply template background if available
      // if (template.backgroundUrl) {
      //   doc.image(template.backgroundUrl, 0, 0, {
      //     width: doc.page.width,
      //     height: doc.page.height,
      //   });
      // }
      
      // Header with logo on left and QR code on right
      doc.y = 50; // Reset position to top margin
      
      // Left side: Logo
      const logoPath = process.env.CERTIFICATE_LOGO_PATH || 
                       path.resolve(__dirname, '..', '..', 'assets', 'logo.png');
      
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 50, doc.y, {
          fit: [100, 100],
          align: 'right',
        });
      }
      
      // Right side: QR code
      doc.image(qrCodePath, doc.page.width - 150, doc.y, {
        fit: [100, 100],
        align: 'right',
      });
      
      // Move down past the header elements
      doc.y = 170;
      
      // Apply template styles or fallback to defaults
      const styles = template.styles || {};
      
      // Border/frame for certificate (optional)
      doc.rect(50, 50, pageWidth, doc.page.height - 100).stroke();
      
      // Title
      doc.fontSize(styles.titleFontSize || 28)
         .fillColor(styles.titleColor || '#000066')
         .font(styles.titleFont || 'Helvetica-Bold')
         .text(certificate.title, 50, doc.y, { 
           align: 'center',
           width: pageWidth,
           underline: styles.titleUnderline || false
         });
      
      doc.moveDown(2);
      
      // Body text
      doc.fontSize(styles.bodyFontSize || 16)
         .fillColor(styles.bodyColor || '#000000')
         .font(styles.bodyFont || 'Helvetica')
         .text(`This is to certify that`, { 
           align: 'center',
           width: pageWidth
         });
      
      doc.moveDown();
      
      // Recipient name
      doc.fontSize(styles.recipientFontSize || 24)
         .fillColor(styles.recipientColor || '#000066')
         .font(styles.recipientFont || 'Helvetica-Bold')
         .text(certificate.recipientName, { 
           align: 'center',
           width: pageWidth
         });
      
      doc.moveDown(1.5);
      
      // Description
      doc.fontSize(styles.descriptionFontSize || 16)
         .fillColor(styles.descriptionColor || '#000000')
         .font(styles.descriptionFont || 'Helvetica')
         .text(certificate.description, { 
           align: 'center',
           width: pageWidth
         });
      
      doc.moveDown(2);
      
      // Date information in a flex-like arrangement
      const currentY = doc.y;
      const dateTextWidth = pageWidth / 2 - 20;
      
      // Left side: Issue date
      doc.fontSize(styles.datesFontSize || 14)
         .fillColor(styles.datesColor || '#000000')
         .text(
           `Issued on: ${new Date(certificate.issueDate).toLocaleDateString()}`,
           50, currentY,
           { 
             align: 'center',
             width: dateTextWidth
           }
         );
      
      // Right side: Expiry date (if available)
      if (certificate.expiryDate) {
        const expiryDate = new Date(certificate.expiryDate);
        doc.text(
          `Valid until: ${expiryDate.toLocaleDateString()}`, 
          50 + pageWidth / 2, currentY,
          { 
            align: 'center',
            width: dateTextWidth
          }
        );
      }
      
      doc.moveDown(3);
      
      // Center position for signature line
      const centerX = doc.page.width / 2;
      const signatureLineWidth = pageWidth / 3;
      
      // Draw signature line centered on the page
      const signatureY = doc.y;
      doc.moveTo(centerX - signatureLineWidth/2, signatureY)
         .lineTo(centerX + signatureLineWidth/2, signatureY)
         .stroke();
      
      doc.moveDown(0.5);
      
      // Issuer information - ensure it's centered below the signature line
      doc.fontSize(styles.issuerFontSize || 14)
         .fillColor(styles.issuerColor || '#000000')
         .text(`${certificate.issuerName}`, 50, doc.y, { 
           align: 'center',
           width: pageWidth
         });
      
      doc.moveDown(0.5);
      
      // Label for issuer signature - ensure it's centered
      doc.fontSize(12)
         .text('Issuer', 50, doc.y, { 
           align: 'center',
           width: pageWidth
         });
      
      doc.moveDown(2);
      
      // Footer with certificate details
      const footerY = doc.page.height - 80;
      doc.fontSize(10)
         .fillColor('#333333')
         .text(`Serial Number: ${certificate.serialNumber}`, 50, footerY, { 
           align: 'center',
           width: pageWidth
         });
      
      // Verification instructions
      doc.moveDown(0.5);
      doc.fontSize(8)
         .fillColor('#666666')
         .text(`Verify this certificate at: ${verificationUrl}`, { 
           align: 'center',
           width: pageWidth
         });
      
      // Add blockchain verification hash if available
      if (certificate.blockchainHash) {
        doc.moveDown(0.5);
        doc.fontSize(7)
           .fillColor('#999999')
           .text(`Blockchain Verification: ${certificate.blockchainHash.substring(0, 16)}...`, { 
             align: 'center',
             width: pageWidth
           });
      }
      
      // Close the document and finalize it
      doc.end();
      
      // Wait for the stream to finish
      await new Promise((resolve, reject) => {
        stream.on('finish', () => resolve(undefined));
        stream.on('error', reject);
      });
      
      // Update certificate with image URL
      certificate.imageUrl = `/public/certificates/${certificate.title} for ${certificate.recipientName}.pdf`;

      // Store relative path
      certificate.pdfPath = `/certificates/${certificate.title} for ${certificate.recipientName} SId ${certificate.serialNumber}.pdf`;
      
    } catch (error) {
      console.error(`Error generating certificate PDF: ${error.message}`);
      throw new Error(`Failed to generate certificate PDF: ${error.message}`);
    }
  }
  
}