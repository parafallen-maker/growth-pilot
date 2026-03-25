import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiAuthGuard } from '../../../common/auth.guard';
import { ok } from '../../../common/api-response';
import { CreateGoalCheckinDto } from '../dto/create-goal-checkin.dto';
import { CreateGrowthGoalDto } from '../dto/create-growth-goal.dto';
import { CreateGrowthObservationDto } from '../dto/create-growth-observation.dto';
import { CreateRubricTemplateDto } from '../dto/create-rubric-template.dto';
import { GenerateGrowthReportDto } from '../dto/generate-report.dto';
import { GoalQueryDto } from '../dto/goal-query.dto';
import { ObservationQueryDto } from '../dto/observation-query.dto';
import { PublishGrowthReportDto } from '../dto/publish-growth-report.dto';
import { ReportQueryDto } from '../dto/report-query.dto';
import { ReviewGrowthReportDto } from '../dto/review-growth-report.dto';
import { RubricQueryDto } from '../dto/rubric-query.dto';
import { GrowthService } from '../service/growth.service';

@Controller('growth')
@UseGuards(ApiAuthGuard)
export class GrowthController {
  constructor(private readonly growthService: GrowthService) {}

  @Get('rubrics')
  async listRubrics(@Query() query: RubricQueryDto) {
    return ok(await this.growthService.listRubrics(query));
  }

  @Get('rubrics/:templateId')
  async getRubric(@Param('templateId') templateId: string) {
    return ok(await this.growthService.getRubric(templateId));
  }

  @Post('rubrics')
  async createRubric(@Body() payload: CreateRubricTemplateDto) {
    return ok(await this.growthService.createRubric(payload));
  }

  @Get('observations')
  async listObservations(@Query() query: ObservationQueryDto) {
    return ok(await this.growthService.listObservations(query));
  }

  @Post('observations')
  async createObservation(@Body() payload: CreateGrowthObservationDto) {
    return ok(await this.growthService.createObservation(payload));
  }

  @Get('goals')
  async listGoals(@Query() query: GoalQueryDto) {
    return ok(await this.growthService.listGoals(query));
  }

  @Post('goals')
  async createGoal(@Body() payload: CreateGrowthGoalDto) {
    return ok(await this.growthService.createGoal(payload));
  }

  @Post('goals/:goalId/checkins')
  async createCheckin(@Param('goalId') goalId: string, @Body() payload: CreateGoalCheckinDto) {
    return ok(await this.growthService.createCheckin(goalId, payload));
  }

  @Get('reports')
  async listReports(@Query() query: ReportQueryDto) {
    return ok(await this.growthService.listReports(query));
  }

  @Get('reports/:reportId')
  async getReport(@Param('reportId') reportId: string) {
    return ok(await this.growthService.getReportDetail(reportId));
  }

  @Post('reports/generate')
  async generateReport(@Body() payload: GenerateGrowthReportDto) {
    return ok(await this.growthService.generateReportDraft(payload));
  }

  @Post('reports/:reportId/review')
  async reviewReport(@Param('reportId') reportId: string, @Body() payload: ReviewGrowthReportDto) {
    return ok(await this.growthService.reviewReport(reportId, payload));
  }

  @Post('reports/:reportId/publish')
  async publishReport(@Param('reportId') reportId: string, @Body() payload: PublishGrowthReportDto) {
    return ok(await this.growthService.publishReport(reportId, payload));
  }
}
