import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { Auth } from './auth/entities/auth.entity';
import { GatewayModule } from './modules/gateway/gateway.module';
import { CertificateModule } from './modules/certificates/certificate.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_DATABASE || 'starkcert',
      entities: [Auth],
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    AuthModule,
    GatewayModule,
    CertificateModule,
    IntegrationsModule,
    StorageModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
