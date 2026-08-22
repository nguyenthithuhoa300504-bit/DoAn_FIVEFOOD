import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { BranchesService } from './branches.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  async findAll() {
    return this.branchesService.findAll();
  }

  // Cần đăng nhập với quyền Admin để thực hiện các thao tác dưới đây
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @Post()
  async create(@Body() createBranchDto: any) {
    return this.branchesService.create(createBranchDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateBranchDto: any) {
    return this.branchesService.update(+id, updateBranchDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.branchesService.remove(+id);
  }
}
