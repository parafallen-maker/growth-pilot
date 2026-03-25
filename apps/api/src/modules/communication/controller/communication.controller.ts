import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiAuthGuard } from '../../../common/auth.guard';
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
@UseGuards(ApiAuthGuard)
export class CommunicationController {
  constructor(private readonly communicationService: CommunicationService) {}

  @Get('records')
  listRecords(@Query() query: CommunicationQueryDto) {
    return ok(this.communicationService.listRecords(query));
  }

  @Get('records/:recordId')
  getRecord(@Param('recordId') recordId: string) {
    return ok(this.communicationService.getRecord(recordId));
  }

  @Post('records')
  createRecord(@Body() payload: CreateCommunicationRecordDto) {
    return ok(this.communicationService.createRecord(payload));
  }

  @Get('templates')
  listTemplates(@Query() query: MessageTemplateQueryDto) {
    return ok(this.communicationService.listTemplates(query));
  }

  @Post('templates')
  createTemplate(@Body() payload: CreateMessageTemplateDto) {
    return ok(this.communicationService.createTemplate(payload));
  }

  @Patch('templates/:templateId')
  updateTemplate(@Param('templateId') templateId: string, @Body() payload: UpdateMessageTemplateDto) {
    return ok(this.communicationService.updateTemplate(templateId, payload));
  }

  @Get('message-tasks')
  listMessageTasks(@Query() query: MessageTaskQueryDto) {
    return ok(this.communicationService.listMessageTasks(query));
  }

  @Post('message-tasks')
  createMessageTask(@Body() payload: CreateMessageTaskDto) {
    return ok(this.communicationService.createMessageTask(payload));
  }

  @Patch('message-tasks/:taskId/status')
  updateMessageTaskStatus(@Param('taskId') taskId: string, @Body() payload: UpdateMessageTaskStatusDto) {
    return ok(this.communicationService.updateMessageTaskStatus(taskId, payload));
  }

  @Get('messages')
  listMessages(@Query() query: MessageTaskQueryDto) {
    return ok(this.communicationService.listMessageTasks(query));
  }

  @Post('messages')
  createMessage(@Body() payload: CreateMessageTaskDto) {
    return ok(this.communicationService.createMessageTask(payload));
  }
}
