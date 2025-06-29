import { 
  Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, 
  NotFoundException
} from '@nestjs/common';
import { CertificatesService } from './certificates.service';
import { CreateCertificateDto } from './dto/create-certificate.dto';
import { UpdateCertificateDto } from './dto/update-certificate.dto';

@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createCertificateDto: CreateCertificateDto) {
    try {
      return await this.certificatesService.create(createCertificateDto);
    } catch (error) {
      throw error;
    }
  }

  @Post('/batch')
  @HttpCode(HttpStatus.CREATED)
  async batchCreate(@Body() createCertificateDtos: CreateCertificateDto[]) {
    try {
      return await this.certificatesService.batchCreate(createCertificateDtos);
    } catch (error) {
      throw error;
    }
  }

  @Get()
  async findAll() {
    try {
      return await this.certificatesService.findAll();
    } catch (error) {
      throw error;
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      return await this.certificatesService.findOne(id);
    } catch (error) {
      throw error;
    }
  }

  @Get('/cert/:id')
async getCertificate(@Param('id') id: string): Promise<any> {
  const certificate = await this.certificatesService.findOne(id);
  if (!certificate) throw new NotFoundException('Certificate not found');
  const { pdfPath, ...certificateData } = certificate;
  return { ...certificateData,  pdfUrl: `http://localhost:3000${pdfPath}`};
}


  @Get('/serial/:serialNumber')
  async findBySerialNumber(@Param('serialNumber') serialNumber: string) {
    try {
      return await this.certificatesService.findBySerialNumber(serialNumber);
    } catch (error) {
      throw error;
    }
  }

  @Get('/issuer/:issuerId')
  async findByIssuer(@Param('issuerId') issuerId: string) {
    try {
      return await this.certificatesService.findByIssuer(issuerId);
    } catch (error) {
      throw error;
    }
  }

  @Get('/recipient/:recipientId')
  async findByRecipient(@Param('recipientId') recipientId: string) {
    try {
      return await this.certificatesService.findByRecipient(recipientId);
    } catch (error) {
      throw error;
    }
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateCertificateDto: UpdateCertificateDto) {
    try {
      return await this.certificatesService.update(id, updateCertificateDto);
    } catch (error) {
      throw error;
    }
  }

  @Patch('/revoke/:id')
  async revoke(@Param('id') id: string, @Body('reason') reason: string) {
    try {
      return await this.certificatesService.revoke(id, reason);
    } catch (error) {
      throw error;
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    try {
      await this.certificatesService.revoke(id, 'Deleted by admin');
      return { message: `Certificate ${id} has been revoked (soft delete)` };
    } catch (error) {
      throw error;
    }
  }
}