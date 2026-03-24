import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ok } from '../../../common/api-response';
import { CreateGoalCheckinDto } from '../dto/create-goal-checkin.dto';
import { CreateGrowthGoalDto } from '../dto/create-growth-goal.dto';
import { CreateGrowthObservationDto } from '../dto/create-growth-observation.dto';
import { CreateRubricTemplateDto } from '../dto/create-rubric-template.dto';
import { GenerateGrowthReportDto } from '../dto/generate-report.dto';
import { GoalQueryDto } from '../dto/goal-query.dto';
import { ObservationQueryDto } from '../dto/observation-query.dto';
import { ReportQueryDto } from '../dto/report-query.dto';
import { RubricQueryDto } from '../dto/rubric-query.dto';
import { GrowthService } from '../service/growth.service';

@Controller('growth')
export class GrowthController {
  constructor(private readonly growthService: GrowthService) {}

  @Get('rubrics')
  listRubrics(@Query() query: RubricQueryDto) {
    return ok(this.growthService.listRubrics(query));
  }

  @Get('rubrics/:templateId')
  getRubric(@Param('templateId') templateId: string) {
    return ok(this.growthService.getRubric(templateId));
  }

  @Post('rubrics')
  createRubric(@Body() payload: CreateRubricTemplateDto) {
    return ok(this.growthService.createRubric(payload));
  }

  @Get('observations')
  listObservations(@Query() query: ObservationQueryDto) {
    return ok(this.growthService.listObservations(query));
  }

  @Post('observations')
  createObservation(@Body() payload: CreateGrowthObservationDto) {
    return ok(this.growthService.createObservation(payload));
  }

  @Get('goals')
  listGoals(@Query() query: GoalQueryDto) {
    return ok(this.growthService.listGoals(query));
  }

  @Post('goals')
  createGoal(@Body() payload: CreateGrowthGoalDto) {
    return ok(this.growthService.createGoal(payload));
  }

  @Post('goals/:goalId/checkins')
  createCheckin(@Param('goalId') goalId: string, @Body() payload: CreateGoalCheckinDto) {
    return ok(this.growthService.createCheckin(goalId, payload));
  }

  @Get('reports')
  listReports(@Query() query: ReportQueryDto) {
    return ok(this.growthService.listReports(query));
  }

  @Post('reports/generate')
  generateReport(@Body() payload: GenerateGrowthReportDto) {
    return ok(this.growthService.generateReportDraft(payload));
  }
}
