import { Module } from '@nestjs/common';
import { AssessmentsService } from './assessments.service';
import { GradeRecordService } from './grade-record.service';
import { TeacherAssessmentsController } from './teacher-assessments.controller';
import { StudentAssessmentsController } from './student-assessments.controller';

@Module({
  controllers: [TeacherAssessmentsController, StudentAssessmentsController],
  providers: [AssessmentsService, GradeRecordService],
  exports: [GradeRecordService],
})
export class AssessmentsModule {}
