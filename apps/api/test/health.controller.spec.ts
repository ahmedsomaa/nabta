import { HealthController } from '../src/health.controller';

describe('HealthController', () => {
  it('returns ok', () => {
    const controller = new HealthController();
    expect(controller.health()).toEqual({ status: 'ok', service: 'nabta-api' });
  });
});
