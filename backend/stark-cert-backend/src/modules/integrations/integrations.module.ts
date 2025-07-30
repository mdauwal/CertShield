// integrations.module.ts
import { Module } from '@nestjs/common';
import { IntegrationsController } from './controllers/integrations.controller';
import { IntegrationHubService } from './services/integration-hub.service';
import { MoodleConnector } from './services/lms/moodle.connector';
import { CanvasConnector } from './services/lms/canvas.connector';
import { BlackboardConnector } from './services/lms/blackboard.connector';
import { WorkdayConnector } from './services/hr/workday.connector';
import { BambooHRConnector } from './services/hr/bamboohr.connector';
import { ADPConnector } from './services/hr/adp.connector';
import { WebhookService } from './services/webhook.service';

@Module({
  controllers: [IntegrationsController],
  providers: [
    IntegrationHubService,
    WebhookService,
    MoodleConnector,
    CanvasConnector,
    BlackboardConnector,
    WorkdayConnector,
    BambooHRConnector,
    ADPConnector,
  ],
})
export class IntegrationsModule {}
