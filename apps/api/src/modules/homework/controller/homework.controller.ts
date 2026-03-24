import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { ok } from '../../../common/api-response';
import { CreateHomeworkSubmissionDto } from '../dto/create-homework-submission.dto';
import { HomeworkReviewDto } from '../dto/homework-review.dto';
import { HomeworkSubmissionQueryDto } from '../dto/homework-submission-query.dto';
import { TriggerHomeworkAnalysisDto } from '../dto/trigger-analysis.dto';
import { HomeworkService } from '../service/homework.service';

@Controller('homework')
export class HomeworkController {
  constructor(private readonly homeworkService: HomeworkService) {}

  @Get('submissions')
  listSubmissions(@Query() query: HomeworkSubmissionQueryDto) {
    return ok(this.homeworkService.listSubmissions(query));
  }

  @Get('submissions/:submissionId')
  getSubmissionDetail(@Param('submissionId') submissionId: string) {
    return ok(this.homeworkService.getSubmissionDetail(submissionId));
  }

  @Post('submissions')
  createSubmission(@Body() payload: CreateHomeworkSubmissionDto) {
    return ok(this.homeworkService.createSubmission(payload));
  }

  @Post('submissions/:submissionId/analyze')
  async triggerAnalysis(
    @Param('submissionId') submissionId: string,
    @Body() payload: TriggerHomeworkAnalysisDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return ok(await this.homeworkService.triggerAnalysis(submissionId, payload, idempotencyKey));
  }

  @Post('submissions/:submissionId/review')
  submitReview(@Param('submissionId') submissionId: string, @Body() payload: HomeworkReviewDto) {
    return ok(this.homeworkService.submitReview(submissionId, payload));
  }
}
