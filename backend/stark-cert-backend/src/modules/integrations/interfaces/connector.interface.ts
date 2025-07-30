export interface ConnectorInterface {
  name: string;
  type: 'LMS' | 'HR';
  connect(config: Record<string, any>): Promise<void>;
  syncData(payload: any): Promise<any>;
  disconnect?(): Promise<void>;
}
