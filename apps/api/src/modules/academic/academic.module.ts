import { Module } from '@nestjs/common';
import { AcademicService } from './academic.service';
import { AcademicYearsController } from './academic-years.controller';
import { GradesController } from './grades.controller';
import { ClassesController } from './classes.controller';
import { SubjectsController } from './subjects.controller';
import { StudentsController } from './students.controller';
import { TeachersController } from './teachers.controller';
import { TeachingAssignmentsController } from './teaching-assignments.controller';

@Module({
  controllers: [
    AcademicYearsController,
    GradesController,
    ClassesController,
    SubjectsController,
    StudentsController,
    TeachersController,
    TeachingAssignmentsController,
  ],
  providers: [AcademicService],
})
export class AcademicModule {}
