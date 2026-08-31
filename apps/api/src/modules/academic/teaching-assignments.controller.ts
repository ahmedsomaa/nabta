import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '@nabta/types';
import { TenantGuard } from './tenant.guard';
import { AcademicService } from './academic.service';

@Controller('teaching-assignments')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class TeachingAssignmentsController {
  constructor(private readonly academic: AcademicService) {}

  @Post()
  @Roles('ADMIN')
  create(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.academic.createTeachingAssignment(user, body);
  }
}
