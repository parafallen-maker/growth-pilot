import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiAuthGuard } from '../../../common/auth.guard';
import { ok } from '../../../common/api-response';
import { CreateHomeworkSubmissionDto } from '../dto/create-homework-submission.dto';
import {
  CreateHomeworkErrorTaxonomyDto,
  HomeworkErrorTaxonomyQueryDto,
  UpdateHomeworkErrorTaxonomyDto,
} from '../dto/homework-error-taxonomy.dto';
import { HomeworkReviewDraftDto } from '../dto/homework-review-draft.dto';
import { HomeworkReviewDto } from '../dto/homework-review.dto';
import { HomeworkSubmissionQueryDto } from '../dto/homework-submission-query.dto';
import { TriggerHomeworkAnalysisDto } from '../dto/trigger-analysis.dto';
import { HomeworkService } from '../service/homework.service';

@Controller('homework')
@UseGuards(ApiAuthGuard)
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

  @Get('submissions/:submissionId/review-draft')
  getReviewDraft(@Param('submissionId') submissionId: string) {
    return ok(this.homeworkService.getReviewDraft(submissionId));
  }

  @Put('submissions/:submissionId/review-draft')
  saveReviewDraft(@Param('submissionId') submissionId: string, @Body() payload: HomeworkReviewDraftDto) {
    return ok(this.homeworkService.saveReviewDraft(submissionId, payload));
  }

  @Post('submissions/:submissionId/review')
  submitReview(@Param('submissionId') submissionId: string, @Body() payload: HomeworkReviewDto) {
    return ok(this.homeworkService.submitReview(submissionId, payload));
  }

  @Get('error-taxonomies')
  listErrorTaxonomies(@Query() query: HomeworkErrorTaxonomyQueryDto) {
    return ok(this.homeworkService.listErrorTaxonomies(query));
  }

  @Post('error-taxonomies')
  createErrorTaxonomy(@Body() payload: CreateHomeworkErrorTaxonomyDto) {
    return ok(this.homeworkService.createErrorTaxonomy(payload));
  }

  @Patch('error-taxonomies/:taxonomyId')
  updateErrorTaxonomy(@Param('taxonomyId') taxonomyId: string, @Body() payload: UpdateHomeworkErrorTaxonomyDto) {
    return ok(this.homeworkService.updateErrorTaxonomy(taxonomyId, payload));
  }

  @Delete('error-taxonomies/:taxonomyId')
  deleteErrorTaxonomy(@Param('taxonomyId') taxonomyId: string) {
    return ok(this.homeworkService.deleteErrorTaxonomy(taxonomyId));
  }

  @Get('outbox-events')
  listOutboxEvents() {
    return ok(this.homeworkService.listOutboxEvents());
  }
}
