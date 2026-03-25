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
  listRecords(@Query() query: CommunicationQueryDto) {
    return ok(this.communicationService.listRecords(query));
  }

  @Get('records/:recordId')
  @RequirePermission('communication:records:view')
  getRecord(@Param('recordId') recordId: string) {
    return ok(this.communicationService.getRecord(recordId));
  }

  @Post('records')
  @RequirePermission('communication:records:manage')
  createRecord(@Body() payload: CreateCommunicationRecordDto) {
    return ok(this.communicationService.createRecord(payload));
  }

  @Get('templates')
  @RequirePermission('communication:templates:view')
  listTemplates(@Query() query: MessageTemplateQueryDto) {
    return ok(this.communicationService.listTemplates(query));
  }

  @Post('templates')
  @RequirePermission('communication:templates:manage')
  createTemplate(@Body() payload: CreateMessageTemplateDto) {
    return ok(this.communicationService.createTemplate(payload));
  }

  @Patch('templates/:templateId')
  @RequirePermission('communication:templates:manage')
  updateTemplate(@Param('templateId') templateId: string, @Body() payload: UpdateMessageTemplateDto) {
    return ok(this.communicationService.updateTemplate(templateId, payload));
  }

  @Get('message-tasks')
  @RequirePermission('communication:messages:view')
  listMessageTasks(@Query() query: MessageTaskQueryDto) {
    return ok(this.communicationService.listMessageTasks(query));
  }

  @Post('message-tasks')
  @RequirePermission('communication:messages:manage')
  createMessageTask(@Body() payload: CreateMessageTaskDto) {
    return ok(this.communicationService.createMessageTask(payload));
  }

  @Patch('message-tasks/:taskId/status')
  @RequirePermission('communication:messages:manage')
  updateMessageTaskStatus(@Param('taskId') taskId: string, @Body() payload: UpdateMessageTaskStatusDto) {
    return ok(this.communicationService.updateMessageTaskStatus(taskId, payload));
  }

  @Get('messages')
  @RequirePermission('communication:messages:view')
  listMessages(@Query() query: MessageTaskQueryDto) {
    return ok(this.communicationService.listMessageTasks(query));
  }

  @Post('messages')
  @RequirePermission('communication:messages:manage')
  createMessage(@Body() payload: CreateMessageTaskDto) {
    return ok(this.communicationService.createMessageTask(payload));
  }
}
