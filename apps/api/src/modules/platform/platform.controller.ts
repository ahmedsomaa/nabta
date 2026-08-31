import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '@nabta/types';

@Controller('platform')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlatformController {
  @Get('ping')
  @Roles('SYSTEM_ADMIN')
  ping(@CurrentUser() user: AuthUser) {
    return { ok: true, role: user.role, scope: 'platform' };
  }
}
