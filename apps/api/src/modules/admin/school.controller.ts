import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '@nabta/types';
import { TenantGuard } from '../academic/tenant.guard';
import { AdminService } from './admin.service';

@Controller('school')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles('ADMIN')
export class SchoolController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  get(@CurrentUser() user: AuthUser) {
    return this.admin.getSchool(user);
  }

  @Patch()
  update(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.admin.updateSchool(user, body);
  }
}
