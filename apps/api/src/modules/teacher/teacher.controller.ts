import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '@nabta/types';
import { TenantGuard } from '../academic/tenant.guard';
import { TeacherService } from './teacher.service';

@Controller('teacher')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles('TEACHER')
export class TeacherController {
  constructor(private readonly teacher: TeacherService) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.teacher.getMe(user);
  }

  @Get('dashboard')
  dashboard(@CurrentUser() user: AuthUser) {
    return this.teacher.getDashboard(user);
  }

  @Get('classes')
  classes(@CurrentUser() user: AuthUser) {
    return this.teacher.listClasses(user);
  }

  @Get('classes/:classId/subjects/:subjectId/roster')
  roster(
    @CurrentUser() user: AuthUser,
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('subjectId', ParseUUIDPipe) subjectId: string,
  ) {
    return this.teacher.getRoster(user, classId, subjectId);
  }

  @Get('classes/:classId/subjects/:subjectId/students/:studentId')
  studentOverview(
    @CurrentUser() user: AuthUser,
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('subjectId', ParseUUIDPipe) subjectId: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ) {
    return this.teacher.getStudentOverview(user, classId, subjectId, studentId);
  }

  @Get('classes/:classId/subjects/:subjectId')
  classSubject(
    @CurrentUser() user: AuthUser,
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('subjectId', ParseUUIDPipe) subjectId: string,
  ) {
    return this.teacher.getClassSubject(user, classId, subjectId);
  }

  @Post('files/presign')
  presign(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.teacher.presign(user, body);
  }

  @Post('units/reorder')
  reorderUnits(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.teacher.reorderUnits(user, body);
  }

  @Post('units')
  createUnit(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.teacher.createUnit(user, body);
  }

  @Patch('units/:id')
  updateUnit(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    return this.teacher.updateUnit(user, id, body);
  }

  @Delete('units/:id')
  deleteUnit(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.teacher.deleteUnit(user, id);
  }

  @Post('lessons/reorder')
  reorderLessons(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.teacher.reorderLessons(user, body);
  }

  @Post('lessons')
  createLesson(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.teacher.createLesson(user, body);
  }

  @Get('lessons/:id')
  lesson(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.teacher.getLesson(user, id);
  }

  @Patch('lessons/:id')
  updateLesson(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    return this.teacher.updateLesson(user, id, body);
  }

  @Delete('lessons/:id')
  deleteLesson(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.teacher.deleteLesson(user, id);
  }

  @Post('lessons/:id/publish')
  publishLesson(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.teacher.publishLesson(user, id);
  }

  @Post('lessons/:id/unpublish')
  unpublishLesson(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.teacher.unpublishLesson(user, id);
  }

  @Post('lessons/:id/materials')
  addMaterial(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    return this.teacher.addMaterial(user, id, body);
  }

  @Get('assignments')
  assignments(@CurrentUser() user: AuthUser) {
    return this.teacher.listAssignments(user);
  }

  @Post('assignments')
  createAssignment(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.teacher.createAssignment(user, body);
  }

  @Get('assignments/:id/submissions')
  submissions(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.teacher.listSubmissions(user, id);
  }

  @Post('assignments/:id/publish')
  publishAssignment(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.teacher.publishAssignment(user, id);
  }

  @Post('assignments/:id/unpublish')
  unpublishAssignment(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.teacher.unpublishAssignment(user, id);
  }

  @Post('assignments/:id/publish-grades')
  publishGrades(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.teacher.publishGrades(user, id);
  }

  @Post('assignments/:id/files')
  addAssignmentFile(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    return this.teacher.addAssignmentFile(user, id, body);
  }

  @Get('assignments/:id')
  assignment(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.teacher.getAssignment(user, id);
  }

  @Patch('assignments/:id')
  updateAssignment(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    return this.teacher.updateAssignment(user, id, body);
  }

  @Get('submissions/:id')
  submission(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.teacher.getSubmission(user, id);
  }

  @Patch('submissions/:id')
  gradeSubmission(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    return this.teacher.gradeSubmission(user, id, body);
  }

  @Get('gradebook')
  gradebook(@CurrentUser() user: AuthUser, @Query() query: unknown) {
    return this.teacher.getGradebook(user, query);
  }

  @Get('attendance')
  attendance(@CurrentUser() user: AuthUser, @Query() query: unknown) {
    return this.teacher.getAttendance(user, query);
  }

  @Put('attendance')
  putAttendance(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.teacher.putAttendance(user, body);
  }
}
