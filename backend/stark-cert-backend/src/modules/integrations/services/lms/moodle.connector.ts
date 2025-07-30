import { Injectable } from '@nestjs/common';
import { ConnectorInterface } from '../../interfaces/connector.interface';

@Injectable()
export class MoodleConnector implements ConnectorInterface {
  name = 'Moodle';
  type: 'LMS' = 'LMS';

  async connect(config: any): Promise<void> {
    // Authenticate or test API key
  }

  async syncData(payload: any): Promise<any> {
    // Call Moodle REST API
  }
}
