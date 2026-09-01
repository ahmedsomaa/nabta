import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { SchoolController } from './school.controller';

@Module({
  controllers: [AdminController, SearchController, SchoolController],
  providers: [AdminService, SearchService],
})
export class AdminModule {}
