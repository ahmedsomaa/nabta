import { AuthService } from '../src/modules/auth/auth.service';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthService login', () => {
  it('rejects disabled accounts', async () => {
    const users = {
      findByEmail: jest.fn().mockResolvedValue({
        id: '1',
        email: 'a@b.c',
        status: 'disabled',
        passwordHash: 'hash',
      }),
    };
    const service = new AuthService(
      {} as never,
      users as never,
      {} as never,
      {} as never,
      {} as never,
    );
    await expect(service.login({ email: 'a@b.c', password: 'Password123!' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
