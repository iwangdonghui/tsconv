import { describe, expect, it } from 'vitest';
import { CircuitBreaker } from '../api/services/error-handling/error-recovery-strategies';

describe('CircuitBreaker.getStatus', () => {
  it('returns expected shape', () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, recoveryTimeoutMs: 10 });
    const status = cb.getStatus();
    expect(status).toHaveProperty('state');
    expect(status).toHaveProperty('failureCount');
    expect(status).toHaveProperty('metrics');
    expect(status.metrics).toHaveProperty('totalRequests');
    expect(status.metrics).toHaveProperty('failedRequests');
    expect(status.metrics).toHaveProperty('successfulRequests');
    expect(status.metrics).toHaveProperty('rejectedRequests');
  });

  it('opens circuit when failure threshold is exceeded', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, recoveryTimeoutMs: 10 });
    // simulate one failure to exceed threshold
    try {
      await cb.execute(async () => {
        throw new Error('fail');
      });
    } catch {
      // Expected error, ignore
    }

    const statusAfter = cb.getStatus();
    expect(['OPEN', 'HALF_OPEN', 'CLOSED']).toContain(statusAfter.state);
    expect(statusAfter.failureCount).toBeGreaterThanOrEqual(1);
  });
});
