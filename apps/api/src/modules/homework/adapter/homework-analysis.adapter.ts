import type { HomeworkAnalysisAdapterInput, HomeworkAnalysisAdapterOutput } from '@growthpilot/schema/index';

export const HOMEWORK_ANALYSIS_ADAPTER = Symbol('HOMEWORK_ANALYSIS_ADAPTER');

export interface HomeworkAnalysisAdapter {
  analyze(input: HomeworkAnalysisAdapterInput): Promise<HomeworkAnalysisAdapterOutput>;
}
