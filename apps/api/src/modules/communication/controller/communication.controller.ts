import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiAuthGuard } from '../../../common/auth.guard';
import { PermissionGuard } from '../../../common/permission.guard';
import { RequirePermission } from '../../../common/permission.decorator';
import { ok } from '../../../common/api-response';
import { CommunicationQueryDto } from '../dto/communication-query.dto';
import { CreateCommunicationRecordDto } from '../dto/create-communication-record.dto';
import { CreateMessageTaskDto } from '../dto/create-message-task.dto';
import { CreateMessageTemplateDto } from '../dto/create-message-template.dto';
import { MessageTaskQueryDto } from '../dto/message-task-query.dto';
import { MessageTemplateQueryDto } from '../dto/message-template-query.dto';
import { UpdateMessageTaskStatusDto } from '../dto/update-message-task-status.dto';
import { UpdateMessageTemplateDto } from '../dto/update-message-template.dto';
import { CommunicationService } from '../service/communication.service';

@Controller('communication')
@UseGuards(ApiAuthGuard, PermissionGuard)
export class CommunicationController {
  constructor(private readonly communicationService: CommunicationService) {}

  @Get('records')
  @RequirePermission('communication:records:view')
  async listRecords(@Query() query: CommunicationQueryDto) {
    return ok(await this.communicationService.listRecords(query));
  }

  @Get('records/:recordId')
  @RequirePermission('communication:records:view')
  async getRecord(@Param('recordId') recordId: string) {
    return ok(await this.communicationService.getRecord(recordId));
  }

  @Post('records')
  @RequirePermission('communication:records:manage')
  async createRecord(@Body() payload: CreateCommunicationRecordDto) {
    return ok(await this.communicationService.createRecord(payload));
  }

  @Get('templates')
  @RequirePermission('communication:templates:view')
  async listTemplates(@Query() query: MessageTemplateQueryDto) {
    return ok(await this.communicationService.listTemplates(query));
  }

  @Post('templates')
  @RequirePermission('communication:templates:manage')
  async createTemplate(@Body() payload: CreateMessageTemplateDto) {
    return ok(await this.communicationService.createTemplate(payload));
  }

  @Patch('templates/:templateId')
  @RequirePermission('communication:templates:manage')
  async updateTemplate(@Param('templateId') templateId: string, @Body() payload: UpdateMessageTemplateDto) {
    return ok(await this.communicationService.updateTemplate(templateId, payload));
  }

  @Get('message-tasks')
  @RequirePermission('communication:messages:view')
  async listMessageTasks(@Query() query: MessageTaskQueryDto) {
    return ok(await this.communicationService.listMessageTasks(query));
  }

  @Post('message-tasks')
  @RequirePermission('communication:messages:manage')
  async createMessageTask(@Body() payload: CreateMessageTaskDto) {
    return ok(await this.communicationService.createMessageTask(payload));
  }

  @Patch('message-tasks/:taskId/status')
  @RequirePermission('communication:messages:manage')
  async updateMessageTaskStatus(@Param('taskId') taskId: string, @Body() payload: UpdateMessageTaskStatusDto) {
    return ok(await this.communicationService.updateMessageTaskStatus(taskId, payload));
  }

  @Get('messages')
  @RequirePermission('communication:messages:view')
  async listMessages(@Query() query: MessageTaskQueryDto) {
    return ok(await this.communicationService.listMessageTasks(query));
  }

  @Post('messages')
  @RequirePermission('communication:messages:manage')
  async createMessage(@Body() payload: CreateMessageTaskDto) {
    return ok(await this.communicationService.createMessageTask(payload));
  }
}
