import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '@nabta/types';
import { TenantGuard } from '../academic/tenant.guard';
import { AssessmentsService } from './assessments.service';

@Controller('teacher')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles('TEACHER')
export class TeacherAssessmentsController {
  constructor(private readonly assessments: AssessmentsService) {}

  @Get('assessments')
  list(@CurrentUser() user: AuthUser) {
    return this.assessments.listTeacherAssessments(user);
  }

  @Post('assessments')
  create(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.assessments.createAssessment(user, body);
  }

  @Get('assessments/:id/results')
  results(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.assessments.getResults(user, id);
  }

  @Get('assessments/:id/attempts/:attemptId')
  attempt(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
  ) {
    return this.assessments.getTeacherAttempt(user, id, attemptId);
  }

  @Get('assessments/:id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.assessments.getTeacherAssessment(user, id);
  }

  @Patch('assessments/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    return this.assessments.updateAssessment(user, id, body);
  }

  @Delete('assessments/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.assessments.deleteAssessment(user, id);
  }

  @Post('assessments/:id/publish')
  publish(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.assessments.publishAssessment(user, id);
  }

  @Post('assessments/:id/unpublish')
  unpublish(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.assessments.unpublishAssessment(user, id);
  }

  @Post('assessments/:id/questions/reorder')
  reorder(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    return this.assessments.reorderQuestions(user, id, body);
  }

  @Post('assessments/:id/questions')
  createQuestion(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    return this.assessments.createQuestion(user, id, body);
  }

  @Patch('questions/:id')
  updateQuestion(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    return this.assessments.updateQuestion(user, id, body);
  }

  @Delete('questions/:id')
  deleteQuestion(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.assessments.deleteQuestion(user, id);
  }

  @Post('questions/:id/options')
  createOption(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    return this.assessments.createOption(user, id, body);
  }

  @Patch('options/:id')
  updateOption(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    return this.assessments.updateOption(user, id, body);
  }

  @Delete('options/:id')
  deleteOption(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.assessments.deleteOption(user, id);
  }
}
