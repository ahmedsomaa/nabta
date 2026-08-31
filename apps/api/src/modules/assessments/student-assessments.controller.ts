import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '@nabta/types';
import { TenantGuard } from '../academic/tenant.guard';
import { AssessmentsService } from './assessments.service';

@Controller('me')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles('STUDENT')
export class StudentAssessmentsController {
  constructor(private readonly assessments: AssessmentsService) {}

  @Get('assessments')
  list(@CurrentUser() user: AuthUser) {
    return this.assessments.listStudentAssessments(user);
  }

  @Get('assessments/:id')
  overview(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.assessments.getStudentOverview(user, id);
  }

  @Post('assessments/:id/start')
  start(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.assessments.startAttempt(user, id);
  }

  @Get('attempts/:id')
  attempt(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.assessments.getStudentAttempt(user, id);
  }

  @Patch('attempts/:id/answers')
  answers(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    return this.assessments.saveAnswer(user, id, body);
  }

  @Post('attempts/:id/submit')
  submit(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.assessments.submitAttempt(user, id);
  }

  @Get('attempts/:id/result')
  result(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.assessments.getStudentResult(user, id);
  }

  @Get('grades')
  grades(@CurrentUser() user: AuthUser) {
    return this.assessments.listGrades(user);
  }

  @Get('grades/:subjectId')
  gradeDetail(@CurrentUser() user: AuthUser, @Param('subjectId', ParseUUIDPipe) subjectId: string) {
    return this.assessments.getGradeDetail(user, subjectId);
  }
}
