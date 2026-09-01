import { Module } from '@nestjs/common';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';
import { HealthModule } from '../../health.module';

@Module({
  imports: [HealthModule],
  controllers: [PlatformController],
  providers: [PlatformService],
})
export class PlatformModule {}
