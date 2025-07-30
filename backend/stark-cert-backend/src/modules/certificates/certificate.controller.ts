import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFiles,
  HttpCode,
  HttpStatus,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { CertificateService } from './services/certificate.service';
import { BlockchainService } from './services/blockchain.service';
import { CreateCertificateDto } from './dto/create-certificate.dto';
import { UpdateCertificateDto } from './dto/update-certificate.dto';
import { SearchCertificateDto } from './dto/search-certificate.dto';
import { BatchCertificateDto, BatchCertificateResponseDto } from './dto/batch-certificate.dto';

@ApiTags('Certificates')
@Controller('certificates')
export class CertificateController {
  constructor(
    private readonly certificateService: CertificateService,
    private readonly blockchainService: BlockchainService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new certificate' })
  @ApiResponse({ status: 201, description: 'Certificate created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@Body() createCertificateDto: CreateCertificateDto) {
    return this.certificateService.create(createCertificateDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all certificates with search and filtering' })
  @ApiResponse({ status: 200, description: 'Certificates retrieved successfully' })
  async findAll(@Query() searchDto: SearchCertificateDto) {
    return this.certificateService.findAll(searchDto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get certificate statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats() {
    return this.certificateService.getCertificateStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get certificate by ID' })
  @ApiResponse({ status: 200, description: 'Certificate retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Certificate not found' })
  async findOne(@Param('id') id: string) {
    return this.certificateService.findOne(id);
  }

  @Get('serial/:serialNumber')
  @ApiOperation({ summary: 'Get certificate by serial number' })
  @ApiResponse({ status: 200, description: 'Certificate retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Certificate not found' })
  async findBySerialNumber(@Param('serialNumber') serialNumber: string) {
    return this.certificateService.findBySerialNumber(serialNumber);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update certificate' })
  @ApiResponse({ status: 200, description: 'Certificate updated successfully' })
  @ApiResponse({ status: 404, description: 'Certificate not found' })
  async update(@Param('id') id: string, @Body() updateCertificateDto: UpdateCertificateDto) {
    return this.certificateService.update(id, updateCertificateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete certificate' })
  @ApiResponse({ status: 204, description: 'Certificate deleted successfully' })
  @ApiResponse({ status: 404, description: 'Certificate not found' })
  async remove(@Param('id') id: string) {
    await this.certificateService.remove(id);
  }

  @Post('batch')
  @ApiOperation({ summary: 'Process batch of certificates' })
  @ApiResponse({ status: 201, description: 'Batch processed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async processBatch(@Body() batchDto: BatchCertificateDto): Promise<BatchCertificateResponseDto> {
    return this.certificateService.processBatch(batchDto);
  }

  @Get(':id/verify')
  @ApiOperation({ summary: 'Verify certificate on blockchain' })
  @ApiResponse({ status: 200, description: 'Certificate verification completed' })
  @ApiResponse({ status: 400, description: 'Certificate not issued on blockchain' })
  async verifyCertificate(@Param('id') id: string) {
    return this.certificateService.verifyCertificate(id);
  }

  @Post(':id/revoke')
  @ApiOperation({ summary: 'Revoke certificate' })
  @ApiResponse({ status: 200, description: 'Certificate revoked successfully' })
  @ApiResponse({ status: 404, description: 'Certificate not found' })
  async revokeCertificate(
    @Param('id') id: string,
    @Body() body: { reason?: string; revokedBy?: string }
  ) {
    const updateDto: UpdateCertificateDto = {
      status: 'revoked' as any,
      revocationReason: body.reason,
      revokedBy: body.revokedBy,
    };
    return this.certificateService.update(id, updateDto);
  }

  @Get(':id/qr')
  @ApiOperation({ summary: 'Get QR code data for certificate' })
  @ApiResponse({ status: 200, description: 'QR code data retrieved' })
  @ApiResponse({ status: 404, description: 'Certificate not found' })
  async getQrCode(@Param('id') id: string) {
    const certificate = await this.certificateService.findOne(id);
    return {
      qrCodeData: certificate.qrCodeData,
      verificationUrl: certificate.verificationUrl,
      serialNumber: certificate.serialNumber,
      blockchainHash: certificate.blockchainHash,
    };
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload certificate assets' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        certificate: {
          type: 'string',
          format: 'binary',
          description: 'Certificate file (PDF, PNG, JPG)',
        },
        template: {
          type: 'string',
          format: 'binary',
          description: 'Template file',
        },
        assets: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Additional asset files',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Files uploaded successfully' })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'certificate', maxCount: 1 },
      { name: 'template', maxCount: 1 },
      { name: 'assets', maxCount: 10 },
    ])
  )
  async uploadFiles(
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: '.(pdf|png|jpg|jpeg)' }),
        ],
      })
    )
    files: {
      certificate?: Express.Multer.File[];
      template?: Express.Multer.File[];
      assets?: Express.Multer.File[];
    }
  ) {
    // In a real implementation, this would save files and return URLs
    return {
      message: 'Files uploaded successfully',
      uploadedFiles: {
        certificate: files.certificate?.[0]?.filename,
        template: files.template?.[0]?.filename,
        assets: files.assets?.map(file => file.filename) || [],
      },
    };
  }

  @Get('blockchain/status')
  @ApiOperation({ summary: 'Get blockchain connection status' })
  @ApiResponse({ status: 200, description: 'Blockchain status retrieved' })
  async getBlockchainStatus() {
    return this.blockchainService.getBlockchainStatus();
  }

  @Get('search/advanced')
  @ApiOperation({ summary: 'Advanced certificate search' })
  @ApiResponse({ status: 200, description: 'Search results retrieved' })
  async advancedSearch(@Query() searchDto: SearchCertificateDto) {
    return this.certificateService.findAll(searchDto);
  }

  @Get('export/csv')
  @ApiOperation({ summary: 'Export certificates to CSV' })
  @ApiResponse({ status: 200, description: 'CSV export completed' })
  async exportToCsv(@Query() searchDto: SearchCertificateDto) {
    const { certificates } = await this.certificateService.findAll(searchDto);
    
    // In a real implementation, this would generate CSV
    const csvData = certificates.map(cert => ({
      id: cert.id,
      title: cert.title,
      recipientName: cert.recipientName,
      recipientEmail: cert.recipientEmail,
      issuerName: cert.issuerName,
      issueDate: cert.issueDate,
      status: cert.status,
      serialNumber: cert.serialNumber,
      blockchainHash: cert.blockchainHash,
    }));

    return {
      message: 'CSV export completed',
      data: csvData,
      total: certificates.length,
    };
  }

  @Post('import/csv')
  @ApiOperation({ summary: 'Import certificates from CSV' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'CSV file with certificate data',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'CSV import completed' })
  @UseInterceptors(FileFieldsInterceptor([{ name: 'file', maxCount: 1 }]))
  async importFromCsv(
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: '.csv' }),
        ],
      })
    )
    files: { file?: Express.Multer.File[] }
  ) {
    // In a real implementation, this would parse CSV and create certificates
    return {
      message: 'CSV import completed',
      importedFile: files.file?.[0]?.filename,
      // Processed certificates would be returned here
    };
  }
} 