import { VercelRequest, VercelResponse } from '@vercel/node';

// Placeholder for API security middleware
export const apiSecurityMiddleware = () => {
  return (_req: VercelRequest, _res: VercelResponse, next: () => void) => {
    next();
  };
};

export const defaultAPISecurityMiddleware = apiSecurityMiddleware;

export interface SecurityThreat {
  type: string;
  severity: string;
  description: string;
  payload?: unknown;
  pattern?: string;
}

export interface SecurityLogEntry {
  timestamp: number;
  level: string;
  message: string;
  ip?: string;
  threat?: SecurityThreat;
  event?: string;
  endpoint?: string;
  userAgent?: string;
  fingerprint?: string;
}

export class SecurityLogger {
  static log(_entry: SecurityLogEntry): void {
    // Placeholder implementation
    void _entry; // mark as intentionally unused
  }

  static getRecentLogs(_count: number): SecurityLogEntry[] {
    void _count; // mark as intentionally unused
    return []; // Placeholder implementation
  }
}

export default apiSecurityMiddleware;
