import { Injectable } from '@nestjs/common';

interface ThrottleConfig {
  maxConcurrent: number;
  queueSize: number;
  timeout: number;
}

interface QueuedRequest {
  id: string;
  priority: number;
  timestamp: number;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

@Injectable()
export class ThrottleService {
  private queues: Map<string, QueuedRequest[]> = new Map();
  private activeRequests: Map<string, number> = new Map();
  private configs: Map<string, ThrottleConfig> = new Map();

  constructor() {
    // Set default configurations
    this.setConfig('default', {
      maxConcurrent: 10,
      queueSize: 100,
      timeout: 30000, // 30 seconds
    });
  }

  setConfig(identifier: string, config: ThrottleConfig): void {
    this.configs.set(identifier, config);
    
    // Initialize queue and active requests if not exists
    if (!this.queues.has(identifier)) {
      this.queues.set(identifier, []);
      this.activeRequests.set(identifier, 0);
    }
  }

  async throttle<T>(
    identifier: string,
    priority: number = 0,
    requestFn: () => Promise<T>,
  ): Promise<T> {
    const config = this.configs.get(identifier) || this.configs.get('default')!;
    
    return new Promise<T>((resolve, reject) => {
      const request: QueuedRequest = {
        id: this.generateRequestId(),
        priority,
        timestamp: Date.now(),
        resolve,
        reject,
      };

      const queue = this.queues.get(identifier)!;
      const activeCount = this.activeRequests.get(identifier)!;

      // Check if queue is full
      if (queue.length >= config.queueSize) {
        reject(new Error('Queue is full'));
        return;
      }

      // Add to queue
      queue.push(request);
      queue.sort((a, b) => b.priority - a.priority || a.timestamp - b.timestamp);

      // Process queue
      this.processQueue(identifier, requestFn, config);
    });
  }

  private async processQueue<T>(
    identifier: string,
    requestFn: () => Promise<T>,
    config: ThrottleConfig,
  ): Promise<void> {
    const queue = this.queues.get(identifier)!;
    const activeCount = this.activeRequests.get(identifier)!;

    // Process requests while under limit
    while (queue.length > 0 && activeCount < config.maxConcurrent) {
      const request = queue.shift()!;
      
      // Check timeout
      if (Date.now() - request.timestamp > config.timeout) {
        request.reject(new Error('Request timeout'));
        continue;
      }

      // Increment active count
      this.activeRequests.set(identifier, activeCount + 1);

      // Execute request
      this.executeRequest(request, requestFn, identifier);
    }
  }

  private async executeRequest<T>(
    request: QueuedRequest,
    requestFn: () => Promise<T>,
    identifier: string,
  ): Promise<void> {
    try {
      const result = await requestFn();
      request.resolve(result);
    } catch (error) {
      request.reject(error);
    } finally {
      // Decrement active count
      const activeCount = this.activeRequests.get(identifier)!;
      this.activeRequests.set(identifier, activeCount - 1);

      // Continue processing queue
      const config = this.configs.get(identifier) || this.configs.get('default')!;
      this.processQueue(identifier, requestFn, config);
    }
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  getQueueStatus(identifier: string): {
    queueLength: number;
    activeRequests: number;
    config: ThrottleConfig;
  } {
    const queue = this.queues.get(identifier) || [];
    const activeCount = this.activeRequests.get(identifier) || 0;
    const config = this.configs.get(identifier) || this.configs.get('default')!;

    return {
      queueLength: queue.length,
      activeRequests: activeCount,
      config,
    };
  }

  clearQueue(identifier: string): void {
    const queue = this.queues.get(identifier);
    if (queue) {
      queue.forEach(request => {
        request.reject(new Error('Queue cleared'));
      });
      queue.length = 0;
    }
  }

  getAllQueueStatuses(): Record<string, { queueLength: number; activeRequests: number }> {
    const statuses: Record<string, { queueLength: number; activeRequests: number }> = {};
    
    for (const [identifier] of this.queues) {
      const status = this.getQueueStatus(identifier);
      statuses[identifier] = {
        queueLength: status.queueLength,
        activeRequests: status.activeRequests,
      };
    }

    return statuses;
  }
} 