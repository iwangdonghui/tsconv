import { VercelRequest, VercelResponse } from '@vercel/node';
import { APIErrorHandler, createCorsHeaders } from '../utils/response';

export interface HandlerOptions {
  allowedMethods?: string[];
  requireAuth?: boolean;
  timeout?: number;
  enableCaching?: boolean;
  enableRateLimit?: boolean;
}

export interface HandlerContext {
  startTime: number;
  requestId: string;
  method: string;
  query: Record<string, unknown>;
  body: unknown;
}

export abstract class BaseHandler {
  protected options: HandlerOptions;

  constructor(options: HandlerOptions = {}) {
    this.options = {
      allowedMethods: ['GET', 'POST'],
      requireAuth: false,
      timeout: 10000,
      enableCaching: true,
      enableRateLimit: true,
      ...options,
    };
  }

  async handle(req: VercelRequest, res: VercelResponse): Promise<void> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      // Set CORS headers
      this.setCorsHeaders(req, res);

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
      }

      // Validate HTTP method
      if (!this.options.allowedMethods?.includes(req.method || '')) {
        return APIErrorHandler.handleMethodNotAllowed(
          res,
          `Only ${this.options.allowedMethods?.join(', ')} methods are allowed`
        );
      }

      // Create handler context
      const context: HandlerContext = {
        startTime,
        requestId,
        method: req.method || 'GET',
        query: req.query,
        body: req.body,
      };

      // Set timeout if specified
      let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
      if (this.options.timeout) {
        timeoutHandle = setTimeout(() => {
          throw new Error('Request timeout');
        }, this.options.timeout);
      }

      try {
        // Execute the handler logic
        const result = await this.execute(context);

        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }

        // Send success response
        APIErrorHandler.sendSuccess(res, result, {
          processingTime: Date.now() - startTime,
          itemCount: this.getItemCount(result),
          cacheHit: false, // TODO: Implement cache detection
        });
      } catch (error) {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
        throw error;
      }
    } catch (error) {
      await this.handleError(error as Error, res, startTime);
    }
  }

  protected setCorsHeaders(req: VercelRequest, res: VercelResponse): void {
    const corsHeaders = createCorsHeaders(req.headers.origin as string);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
  }

  protected generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  protected getItemCount(result: unknown): number {
    if (Array.isArray(result)) {
      return result.length;
    }
    if (result && typeof result === 'object') {
      const resultObj = result as Record<string, unknown>;
      if (resultObj.data) {
        return Array.isArray(resultObj.data) ? resultObj.data.length : 1;
      }
    }
    return 1;
  }

  protected async handleError(error: Error, res: VercelResponse, startTime: number): Promise<void> {
    console.error(`Handler error:`, error);

    if (error.message === 'Request timeout') {
      return APIErrorHandler.sendError(
        res,
        APIErrorHandler.createError('TIMEOUT_ERROR', 'Request exceeded timeout limit', 408, {
          timeout: this.options.timeout,
        }),
        408
      );
    }

    if (error.message.includes('Invalid timestamp')) {
      return APIErrorHandler.handleBadRequest(res, error.message, {
        supportedFormats: [
          'Unix timestamp (seconds): 1705315845',
          'Unix timestamp (milliseconds): 1705315845123',
          'ISO string: 2024-01-15T10:30:45Z',
          'Date string: 2024-01-15',
          'Special value: now',
        ],
      });
    }

    APIErrorHandler.handleServerError(res, error, {
      endpoint: this.constructor.name,
      processingTime: Date.now() - startTime,
    });
  }

  // Abstract method that must be implemented by subclasses
  protected abstract execute(context: HandlerContext): Promise<any>;
}
