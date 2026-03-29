import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiAuthGuard } from '../../../common/auth.guard';
import { PermissionGuard } from '../../../common/permission.guard';
import { RequirePermission } from '../../../common/permission.decorator';
import { ok } from '../../../common/api-response';
import { CreateTaskDto } from '../dto/create-task.dto';
import { TaskQueryDto } from '../dto/task-query.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { TasksService } from '../service/tasks.service';

@Controller('tasks')
@UseGuards(ApiAuthGuard, PermissionGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @RequirePermission('tasks:view')
  async list(@Query() query: TaskQueryDto) {
    return ok(await this.tasksService.list(query));
  }

  @Post()
  @RequirePermission('tasks:view')
  async create(@Body() payload: CreateTaskDto) {
    return ok(await this.tasksService.create(payload));
  }

  @Patch(':taskId')
  @RequirePermission('tasks:view')
  async update(@Param('taskId') taskId: string, @Body() payload: UpdateTaskDto) {
    return ok(await this.tasksService.update(taskId, payload));
  }
}
