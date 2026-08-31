import {
  Body,
  Controller,
  Delete,
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

@Controller('classes')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class ClassesController {
  constructor(private readonly academic: AcademicService) {}

  @Get()
  @Roles('ADMIN', 'TEACHER', 'STUDENT')
  list(@CurrentUser() user: AuthUser, @Query() query: unknown) {
    return this.academic.listClasses(user, query);
  }

  @Post()
  @Roles('ADMIN')
  create(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.academic.createClass(user, body);
  }

  @Get(':id')
  @Roles('ADMIN', 'TEACHER', 'STUDENT')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.academic.getClass(user, id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    return this.academic.updateClass(user, id, body);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.academic.deleteClass(user, id);
  }

  @Get(':id/enrollments')
  @Roles('ADMIN', 'TEACHER')
  listEnrollments(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.academic.listEnrollments(user, id);
  }

  @Post(':id/enrollments')
  @Roles('ADMIN')
  enroll(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    return this.academic.enrollStudent(user, id, body);
  }

  @Get(':id/teaching-assignments')
  @Roles('ADMIN', 'TEACHER', 'STUDENT')
  listAssignments(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.academic.listTeachingAssignments(user, id);
  }
}
