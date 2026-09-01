import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '@nabta/types';
import { TenantGuard } from '../academic/tenant.guard';
import { SearchService } from './search.service';

@Controller('search')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles('ADMIN')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: unknown) {
    return this.search.search(user, query);
  }
}
