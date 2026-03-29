import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiAuthGuard } from '../../../common/auth.guard';
import { ok } from '../../../common/api-response';
import { CreateHomeworkSubmissionDto } from '../dto/create-homework-submission.dto';
import {
  CreateHomeworkErrorTaxonomyDto,
  HomeworkErrorTaxonomyQueryDto,
  UpdateHomeworkErrorTaxonomyDto,
} from '../dto/homework-error-taxonomy.dto';
import { BulkApplyHomeworkReviewTagsDto, BulkTriggerHomeworkAnalysisDto } from '../dto/bulk-homework-actions.dto';
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
  async listSubmissions(@Query() query: HomeworkSubmissionQueryDto) {
    return ok(await this.homeworkService.listSubmissions(query));
  }

  @Get('submissions/:submissionId')
  async getSubmissionDetail(@Param('submissionId') submissionId: string) {
    return ok(await this.homeworkService.getSubmissionDetail(submissionId));
  }

  @Get('submissions/:submissionId/analysis-status')
  async getAnalysisStatus(@Param('submissionId') submissionId: string) {
    return ok(await this.homeworkService.getAnalysisStatus(submissionId));
  }

  @Post('submissions')
  async createSubmission(@Body() payload: CreateHomeworkSubmissionDto) {
    return ok(await this.homeworkService.createSubmission(payload));
  }

  @Post('submissions/:submissionId/analyze')
  async triggerAnalysis(
    @Param('submissionId') submissionId: string,
    @Body() payload: TriggerHomeworkAnalysisDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return ok(await this.homeworkService.triggerAnalysis(submissionId, payload, idempotencyKey));
  }

  @Post('submissions/bulk-analyze')
  async bulkTriggerAnalysis(@Body() payload: BulkTriggerHomeworkAnalysisDto) {
    return ok(await this.homeworkService.bulkTriggerAnalysis(payload));
  }

  @Post('submissions/bulk-review-tags')
  async bulkApplyReviewTags(@Body() payload: BulkApplyHomeworkReviewTagsDto) {
    return ok(await this.homeworkService.bulkApplyReviewTags(payload));
  }

  @Get('submissions/:submissionId/review-draft')
  async getReviewDraft(@Param('submissionId') submissionId: string) {
    return ok(await this.homeworkService.getReviewDraft(submissionId));
  }

  @Put('submissions/:submissionId/review-draft')
  async saveReviewDraft(@Param('submissionId') submissionId: string, @Body() payload: HomeworkReviewDraftDto) {
    return ok(await this.homeworkService.saveReviewDraft(submissionId, payload));
  }

  @Post('submissions/:submissionId/review')
  async submitReview(@Param('submissionId') submissionId: string, @Body() payload: HomeworkReviewDto) {
    return ok(await this.homeworkService.submitReview(submissionId, payload));
  }

  @Get('error-taxonomies')
  async listErrorTaxonomies(@Query() query: HomeworkErrorTaxonomyQueryDto) {
    return ok(await this.homeworkService.listErrorTaxonomies(query));
  }

  @Post('error-taxonomies')
  async createErrorTaxonomy(@Body() payload: CreateHomeworkErrorTaxonomyDto) {
    return ok(await this.homeworkService.createErrorTaxonomy(payload));
  }

  @Patch('error-taxonomies/:taxonomyId')
  async updateErrorTaxonomy(@Param('taxonomyId') taxonomyId: string, @Body() payload: UpdateHomeworkErrorTaxonomyDto) {
    return ok(await this.homeworkService.updateErrorTaxonomy(taxonomyId, payload));
  }

  @Delete('error-taxonomies/:taxonomyId')
  async deleteErrorTaxonomy(@Param('taxonomyId') taxonomyId: string) {
    return ok(await this.homeworkService.deleteErrorTaxonomy(taxonomyId));
  }

  @Get('outbox-events')
  async listOutboxEvents() {
    return ok(await this.homeworkService.listOutboxEvents());
  }
}
