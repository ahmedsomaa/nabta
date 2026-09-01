import { HealthController } from '../src/health.controller';
import { HealthService } from '../src/health.service';
import type { PlatformHealth } from '@nabta/types';

describe('HealthController', () => {
  it('returns mocked database and redis status', async () => {
    const payload: PlatformHealth = {
      status: 'ok',
      service: 'nabta-api',
      database: 'ok',
      redis: 'ok',
    };
    const health = { check: jest.fn().mockResolvedValue(payload) };
    const controller = new HealthController(health as unknown as HealthService);
    await expect(controller.check()).resolves.toEqual(payload);
  });

  it('returns degraded when a dependency is down', async () => {
    const payload: PlatformHealth = {
      status: 'degraded',
      service: 'nabta-api',
      database: 'ok',
      redis: 'down',
    };
    const health = { check: jest.fn().mockResolvedValue(payload) };
    const controller = new HealthController(health as unknown as HealthService);
    await expect(controller.check()).resolves.toEqual(payload);
  });
});

describe('HealthService', () => {
  it('reports ok when prisma and redis ping succeed', async () => {
    const prisma = { $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) };
    const service = new HealthService(prisma as never);
    jest.spyOn(service, 'pingRedis').mockResolvedValue('ok');
    await expect(service.check()).resolves.toEqual({
      status: 'ok',
      service: 'nabta-api',
      database: 'ok',
      redis: 'ok',
    });
  });

  it('reports degraded when prisma fails', async () => {
    const prisma = { $queryRaw: jest.fn().mockRejectedValue(new Error('db')) };
    const service = new HealthService(prisma as never);
    jest.spyOn(service, 'pingRedis').mockResolvedValue('ok');
    await expect(service.check()).resolves.toEqual({
      status: 'degraded',
      service: 'nabta-api',
      database: 'down',
      redis: 'ok',
    });
  });
});
