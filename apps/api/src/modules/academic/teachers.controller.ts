import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '@nabta/types';
import { TenantGuard } from './tenant.guard';
import { AcademicService } from './academic.service';

@Controller('teachers')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class TeachersController {
  constructor(private readonly academic: AcademicService) {}

  @Get()
  @Roles('ADMIN', 'TEACHER')
  list(@CurrentUser() user: AuthUser, @Query() query: unknown) {
    return this.academic.listTeachers(user, query);
  }

  @Post()
  @Roles('ADMIN')
  create(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.academic.createTeacher(user, body);
  }

  @Get(':id')
  @Roles('ADMIN', 'TEACHER')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.academic.getTeacher(user, id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    return this.academic.updateTeacher(user, id, body);
  }
}
