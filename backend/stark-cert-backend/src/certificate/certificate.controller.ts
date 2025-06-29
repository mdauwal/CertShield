import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { CertificatesService } from './certificates.service';
import { CreateCertificateDto } from './dto/create-certificate.dto';
import { UpdateCertificateDto } from './dto/update-certificate.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('Certificates')
@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a certificate' })
  @ApiResponse({ status: 201, description: 'Certificate created successfully' })
  @ApiBody({ type: CreateCertificateDto })
  async create(@Body() createCertificateDto: CreateCertificateDto) {
    try {
      return await this.certificatesService.create(createCertificateDto);
    } catch (error) {
      throw error;
    }
  }

  @Post('/batch')
  @ApiOperation({ summary: 'Batch create certificates' })
  @ApiResponse({
    status: 201,
    description: 'Certificates created successfully',
  })
  @ApiBody({ type: [CreateCertificateDto] })
  @HttpCode(HttpStatus.CREATED)
  async batchCreate(@Body() createCertificateDtos: CreateCertificateDto[]) {
    try {
      return await this.certificatesService.batchCreate(createCertificateDtos);
    } catch (error) {
      throw error;
    }
  }

  @Get()
  @ApiOperation({ summary: 'Fetch all certificates' })
  @ApiResponse({ status: 200, description: 'List of certificates returned' })
  async findAll() {
    try {
      return await this.certificatesService.findAll();
    } catch (error) {
      throw error;
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch a certificate by ID' })
  @ApiResponse({ status: 200, description: 'Certificate data returned' })
  @ApiParam({ name: 'id', required: true, description: 'Certificate ID' })
  async findOne(@Param('id') id: string) {
    try {
      return await this.certificatesService.findOne(id);
    } catch (error) {
      throw error;
    }
  }

  @Get('/cert/:id')
  @ApiOperation({ summary: 'Return certificate data and PDF URL' })
  @ApiResponse({ status: 200, description: 'Certificate and PDF URL returned' })
  @ApiParam({ name: 'id', required: true, description: 'Certificate ID' })
  async getCertificate(@Param('id') id: string): Promise<any> {
    const certificate = await this.certificatesService.findOne(id);
    if (!certificate) throw new NotFoundException('Certificate not found');
    const { pdfPath, ...certificateData } = certificate;
    return { ...certificateData, pdfUrl: `http://localhost:3000${pdfPath}` };
  }

  @Get('/serial/:serialNumber')
  @ApiOperation({ summary: 'Find certificate by serial number' })
  @ApiResponse({
    status: 200,
    description: 'Certificate with serial number returned',
  })
  @ApiParam({ name: 'serialNumber', description: 'Certificate serial number' })
  async findBySerialNumber(@Param('serialNumber') serialNumber: string) {
    try {
      return await this.certificatesService.findBySerialNumber(serialNumber);
    } catch (error) {
      throw error;
    }
  }

  @Get('/issuer/:issuerId')
  @ApiOperation({ summary: 'Find certificates by issuer' })
  @ApiResponse({ status: 200, description: 'Certificates by issuer returned' })
  @ApiParam({ name: 'issuerId', description: 'Issuer user ID' })
  async findByIssuer(@Param('issuerId') issuerId: string) {
    try {
      return await this.certificatesService.findByIssuer(issuerId);
    } catch (error) {
      throw error;
    }
  }

  @Get('/recipient/:recipientId')
  @ApiOperation({ summary: 'Find certificates by recipient' })
  @ApiResponse({
    status: 200,
    description: 'Certificates by recipient returned',
  })
  @ApiParam({ name: 'recipientId', description: 'Recipient user ID' })
  async findByRecipient(@Param('recipientId') recipientId: string) {
    try {
      return await this.certificatesService.findByRecipient(recipientId);
    } catch (error) {
      throw error;
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a certificate' })
  @ApiResponse({ status: 200, description: 'Certificate updated successfully' })
  @ApiParam({ name: 'id', description: 'Certificate ID' })
  @ApiBody({ type: UpdateCertificateDto })
  async update(
    @Param('id') id: string,
    @Body() updateCertificateDto: UpdateCertificateDto,
  ) {
    try {
      return await this.certificatesService.update(id, updateCertificateDto);
    } catch (error) {
      throw error;
    }
  }

  @Patch('/revoke/:id')
  @ApiOperation({ summary: 'Revoke a certificate' })
  @ApiResponse({ status: 200, description: 'Certificate revoked' })
  @ApiParam({ name: 'id', description: 'Certificate ID' })
  @ApiBody({ schema: { example: { reason: 'Issued in error' } } })
  async revoke(@Param('id') id: string, @Body('reason') reason: string) {
    try {
      return await this.certificatesService.revoke(id, reason);
    } catch (error) {
      throw error;
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a certificate' })
  @ApiResponse({ status: 204, description: 'Certificate soft deleted' })
  @ApiParam({ name: 'id', description: 'Certificate ID' })
  async remove(@Param('id') id: string) {
    try {
      await this.certificatesService.revoke(id, 'Deleted by admin');
      return { message: `Certificate ${id} has been revoked (soft delete)` };
    } catch (error) {
      throw error;
    }
  }
}
