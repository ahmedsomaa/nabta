import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import type { HealthCheckStatus, PlatformHealth } from '@nabta/types';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<PlatformHealth> {
    const [database, redis] = await Promise.all([this.pingDatabase(), this.pingRedis()]);
    return {
      status: database === 'ok' && redis === 'ok' ? 'ok' : 'degraded',
      service: 'nabta-api',
      database,
      redis,
    };
  }

  async pingDatabase(): Promise<HealthCheckStatus> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'ok';
    } catch {
      return 'down';
    }
  }

  async pingRedis(): Promise<HealthCheckStatus> {
    const url = process.env.REDIS_URL;
    if (!url) return 'down';
    const client = new Redis(url, {
      maxRetriesPerRequest: 0,
      connectTimeout: 1500,
      lazyConnect: true,
    });
    try {
      await client.connect();
      const reply = await client.ping();
      return reply === 'PONG' ? 'ok' : 'down';
    } catch {
      return 'down';
    } finally {
      client.disconnect();
    }
  }
}
