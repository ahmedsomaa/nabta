import { Body, Controller, Delete, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '@nabta/types';
import { TenantGuard } from './tenant.guard';
import { AcademicService } from './academic.service';

@Controller('terms')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class TermsController {
  constructor(private readonly academic: AcademicService) {}

  @Patch(':id')
  @Roles('ADMIN')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    return this.academic.updateTerm(user, id, body);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.academic.deleteTerm(user, id);
  }
}
