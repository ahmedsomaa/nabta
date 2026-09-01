import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '@nabta/types';
import { TenantGuard } from '../academic/tenant.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('ping')
  ping(@CurrentUser() user: AuthUser) {
    return { ok: true, role: user.role, schoolId: user.schoolId };
  }

  @Get('overview')
  overview(@CurrentUser() user: AuthUser, @Query() query: unknown) {
    return this.admin.overview(user, query);
  }
}
