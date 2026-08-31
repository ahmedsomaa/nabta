import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { TeacherController } from './teacher.controller';
import { TeacherService } from './teacher.service';

@Module({
  imports: [StorageModule],
  controllers: [TeacherController],
  providers: [TeacherService],
})
export class TeacherModule {}
