import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { EmailModule } from './modules/email/email.module';
import { StorageModule } from './modules/storage/storage.module';
import { AcademicModule } from './modules/academic/academic.module';
import { StudentModule } from './modules/student/student.module';
import { MarketingModule } from './modules/marketing/marketing.module';
import { HealthController } from './health.controller';
import { AdminController } from './modules/admin/admin.controller';
import { PlatformController } from './modules/platform/platform.controller';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    PrismaModule,
    EmailModule,
    StorageModule,
    UsersModule,
    AuthModule,
    AcademicModule,
    StudentModule,
    MarketingModule,
  ],
  controllers: [HealthController, AdminController, PlatformController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
