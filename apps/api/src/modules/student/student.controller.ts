import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '@nabta/types';
import { TenantGuard } from '../academic/tenant.guard';
import { StudentService } from './student.service';

@Controller('me')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles('STUDENT')
export class StudentPortalController {
  constructor(private readonly student: StudentService) {}

  @Get()
  me(@CurrentUser() user: AuthUser) {
    return this.student.getMe(user);
  }

  @Get('dashboard')
  dashboard(@CurrentUser() user: AuthUser) {
    return this.student.getDashboard(user);
  }

  @Get('subjects')
  subjects(@CurrentUser() user: AuthUser) {
    return this.student.listSubjects(user);
  }

  @Get('subjects/:id')
  subject(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.student.getSubject(user, id);
  }

  @Get('lessons/:id')
  lesson(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.student.getLesson(user, id);
  }

  @Post('lessons/:id/progress')
  progress(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    return this.student.updateProgress(user, id, body);
  }

  @Get('assignments')
  assignments(@CurrentUser() user: AuthUser) {
    return this.student.listAssignments(user);
  }

  @Get('assignments/:id')
  assignment(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.student.getAssignment(user, id);
  }

  @Post('files/presign')
  presign(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.student.presign(user, body);
  }

  @Post('assignments/:id/draft')
  draft(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    return this.student.saveDraft(user, id, body);
  }

  @Post('assignments/:id/submit')
  submit(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.student.submit(user, id);
  }
}
