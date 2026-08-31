import { createHash, randomBytes } from 'crypto';
import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import {
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
} from '@nabta/validation';
import { UserRole } from '@nabta/database';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { EMAIL_SERVICE, type EmailService } from '../email/email.service';
import { passwordResetEmailHtml } from '../email/templates/password-reset';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @Inject(EMAIL_SERVICE) private readonly email: EmailService,
  ) {}

  private schoolSlug(name: string) {
    const base =
      name
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 40) || 'school';
    return `${base}-${randomBytes(3).toString('hex')}`;
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseExpiryToMs(expiry: string): number {
    const match = /^(\d+)([smhd])$/.exec(expiry);
    if (!match) return 7 * 24 * 60 * 60 * 1000;
    const value = Number(match[1]);
    const unit = match[2];
    const mult = unit === 's' ? 1000 : unit === 'm' ? 60_000 : unit === 'h' ? 3_600_000 : 86_400_000;
    return value * mult;
  }

  private async issueTokens(userId: string, email: string, role: UserRole) {
    const accessSecret = this.config.getOrThrow<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.config.getOrThrow<string>('JWT_REFRESH_SECRET');
    const accessExpiry = this.config.get<string>('JWT_ACCESS_EXPIRY') ?? '15m';
    const refreshExpiry = this.config.get<string>('JWT_REFRESH_EXPIRY') ?? '7d';

    const accessToken = await this.jwt.signAsync(
      { sub: userId, email, role },
      { secret: accessSecret, expiresIn: accessExpiry as `${number}${'s' | 'm' | 'h' | 'd'}` },
    );
    const refreshToken = randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + this.parseExpiryToMs(refreshExpiry));
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(refreshToken),
        expiresAt,
      },
    });
    return { accessToken, refreshToken };
  }

  async register(raw: unknown) {
    const input = registerSchema.parse(raw);
    const email = input.email.toLowerCase();
    const existing = await this.users.findByEmail(email);
    if (existing) {
      throw new BadRequestException('Email is already registered.');
    }

    const passwordHash = await argon2.hash(input.password);
    const result = await this.prisma.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: { name: input.schoolName, slug: this.schoolSlug(input.schoolName) },
      });
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: UserRole.ADMIN,
          schoolId: school.id,
        },
      });
      return user;
    });

    const tokens = await this.issueTokens(result.id, result.email, result.role);
    const created = await this.users.findById(result.id);
    return {
      ...tokens,
      user: this.users.toAuthUser(created ?? result),
    };
  }

  async login(raw: unknown) {
    const input = loginSchema.parse(raw);
    const user = await this.users.findByEmail(input.email.toLowerCase());
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Invalid email or password.');
    }
    const valid = await argon2.verify(user.passwordHash, input.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    const tokens = await this.issueTokens(user.id, user.email, user.role);
    return {
      ...tokens,
      user: this.users.toAuthUser(user),
    };
  }

  async refresh(raw: unknown) {
    const input = refreshSchema.parse(raw);
    const tokenHash = this.hashToken(input.refreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null },
      include: { user: { include: { school: true } } },
    });
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token.');
    }
    if (stored.user.status !== 'active') {
      throw new UnauthorizedException('Account disabled.');
    }
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    const tokens = await this.issueTokens(
      stored.user.id,
      stored.user.email,
      stored.user.role,
    );
    return {
      ...tokens,
      user: this.users.toAuthUser(stored.user),
    };
  }

  async logout(raw: unknown) {
    const input = refreshSchema.parse(raw);
    const tokenHash = this.hashToken(input.refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  async forgotPassword(raw: unknown) {
    const input = forgotPasswordSchema.parse(raw);
    const user = await this.users.findByEmail(input.email.toLowerCase());
    // Always succeed to avoid email enumeration
    if (user && user.status === 'active') {
      const token = randomBytes(32).toString('hex');
      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: this.hashToken(token),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
      const webUrl = this.config.get<string>('WEB_URL') ?? 'http://localhost:5173';
      const resetUrl = `${webUrl}/reset-password?token=${token}`;
      await this.email.send({
        to: user.email,
        subject:
          user.locale === 'ar' ? 'إعادة تعيين كلمة المرور — نبتة' : 'Reset your Nabta password',
        html: passwordResetEmailHtml({
          resetUrl,
          locale: user.locale === 'ar' ? 'ar' : 'en',
        }),
      });
    }
    return { ok: true };
  }

  async resetPassword(raw: unknown) {
    const input = resetPasswordSchema.parse(raw);
    const tokenHash = this.hashToken(input.token);
    const stored = await this.prisma.passwordResetToken.findFirst({
      where: { tokenHash, usedAt: null },
      include: { user: true },
    });
    if (!stored || stored.expiresAt < new Date()) {
      throw new BadRequestException('Reset link is invalid or expired.');
    }
    const passwordHash = await argon2.hash(input.password);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: stored.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: stored.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { ok: true };
  }

  async me(userId: string) {
    const user = await this.users.findById(userId);
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Please log in to continue.');
    }
    return this.users.toAuthUser(user);
  }
}
