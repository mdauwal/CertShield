import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class GatewayMiddleware implements NestMiddleware {
  private readonly logger = new Logger(GatewayMiddleware.name);

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const { method, url, ip, headers } = req;

    // Log incoming request
    this.logger.log(`${method} ${url} - ${ip} - ${headers['user-agent'] || 'Unknown'}`);

    // Add request ID for tracking
    const requestId = this.generateRequestId();
    req['requestId'] = requestId;
    res.setHeader('X-Request-ID', requestId);

    // Add gateway headers
    res.setHeader('X-Gateway-Version', '1.0.0');
    res.setHeader('X-Gateway-Timestamp', new Date().toISOString());

    // Override response.end to log response
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any) {
      const responseTime = Date.now() - startTime;
      const { statusCode } = res;

      // Log response
      this.logger.log(
        `${method} ${url} - ${statusCode} - ${responseTime}ms - ${requestId}`,
      );

      // Add response time header
      res.setHeader('X-Response-Time', `${responseTime}ms`);

      return originalEnd.call(this, chunk, encoding);
    }.bind(this);

    next();
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
} 