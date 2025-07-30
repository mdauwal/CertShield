import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IntegrationHubService } from '../services/integration-hub.service';
import { WebhookService } from '../services/webhook.service';

@Controller('integrations')
export class IntegrationsController {
  constructor(
    private readonly hubService: IntegrationHubService,
    private readonly webhookService: WebhookService,
  ) {}

  @Get()
  getAvailableIntegrations() {
    return this.hubService.getAvailableConnectors();
  }

  @Post('sync/:connector')
  async syncConnector(
    @Param('connector') connectorName: string,
    @Body() payload: any,
  ) {
    return this.hubService.sync(connectorName, payload);
  }

  @Post('webhook/:source')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Param('source') source: string,
    @Body() body: any,
  ) {
    await this.webhookService.handleIncomingWebhook(source, body);
    return { status: 'received', source };
  }
}
