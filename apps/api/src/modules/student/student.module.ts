import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { StudentPortalController } from './student.controller';
import { StudentService } from './student.service';

@Module({
  imports: [StorageModule],
  controllers: [StudentPortalController],
  providers: [StudentService],
})
export class StudentModule {}
