import { Injectable } from '@nestjs/common';
import type { HomeworkAnalysisAdapterInput } from '@growthpilot/schema/index';
import { HomeworkAnalysisAdapter } from './homework-analysis.adapter';

@Injectable()
export class MockHomeworkAnalysisAdapter implements HomeworkAnalysisAdapter {
  async analyze(input: HomeworkAnalysisAdapterInput) {
    const accuracyPct = input.subject === 'math' ? 86 : 90;
    return {
      rawMarkdown: [
        `# Homework Analysis`,
        `- submissionId: ${input.submissionId}`,
        `- subject: ${input.subject}`,
        `- promptVersion: ${input.promptVersion}`,
        `- imageCount: ${input.imageUrls.length}`,
      ].join('\n'),
      structured: {
        accuracyPct,
        errorItems: [
          {
            code: 'mock-question-read',
            label: '审题偏差',
            evidence: '第二大题关键词识别不足',
          },
        ],
        summary: '基础计算能力稳定，但审题仍需二次确认。',
        suggestion: '先圈关键词，再完成列式与验算。',
        confidence: 0.78,
      },
      meta: {
        modelVersion: 'mock-2026-03',
        durationMs: 120,
        inputTokens: 256,
        outputTokens: 128,
      },
    };
  }
}
