import { Injectable } from '@nestjs/common';
import { performance } from 'node:perf_hooks';
import type {
  HomeworkAnalysisAdapterInput,
  HomeworkAnalysisAdapterOutput,
  HomeworkAnalysisStructuredResult,
} from '@growthpilot/schema/index';
import { HomeworkAnalysisAdapter } from './homework-analysis.adapter';
import { resolveOpenAiCompatibleApiKey, resolveOpenAiCompatibleBaseUrl } from './homework-analysis-config';

type OpenAiMessageContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

@Injectable()
export class OpenAiCompatibleHomeworkAnalysisAdapter implements HomeworkAnalysisAdapter {
  async analyze(input: HomeworkAnalysisAdapterInput): Promise<HomeworkAnalysisAdapterOutput> {
    const apiKey = resolveOpenAiCompatibleApiKey();
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY or AI_API_KEY is required when AI_PROVIDER uses the real adapter');
    }

    const model = input.modelName?.trim();
    if (!model) {
      throw new Error('modelName is required for real homework analysis');
    }

    const startedAt = performance.now();
    const response = await fetch(`${resolveOpenAiCompatibleBaseUrl().replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        response_format: { type: 'json_object' },
        messages: this.buildMessages(input),
      }),
    });

    if (!response.ok) {
      throw new Error(`Homework AI provider request failed: ${response.status} ${response.statusText} ${await response.text()}`);
    }

    const payload = await response.json() as {
      model?: string;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
      choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }>;
    };

    const rawContent = this.extractContent(payload);
    const structured = this.parseStructured(rawContent);

    return {
      rawMarkdown: this.toMarkdown(input, structured, rawContent),
      structured,
      meta: {
        modelVersion: payload.model ?? model,
        durationMs: Math.round(performance.now() - startedAt),
        inputTokens: payload.usage?.prompt_tokens,
        outputTokens: payload.usage?.completion_tokens,
      },
    };
  }

  private buildMessages(input: HomeworkAnalysisAdapterInput) {
    const systemPrompt = [
      'You are a strict elementary-school homework analysis assistant.',
      'Review the submission images and return ONLY valid JSON.',
      'The JSON must include: accuracyPct (0-100 number), errorItems (array of {label string, code optional string, evidence optional string}), summary (string), suggestion (string), confidence (0-1 number optional).',
      'Keep errorItems concise and evidence grounded in the images when possible.',
      'Do not wrap JSON in markdown fences.',
    ].join(' ');

    const userText = [
      `submissionId: ${input.submissionId}`,
      `subject: ${input.subject}`,
      `gradeLabel: ${input.gradeLabel ?? 'unknown'}`,
      `promptVersion: ${input.promptVersion}`,
    ].join('\n');

    const content: OpenAiMessageContentPart[] = [
      { type: 'text', text: userText },
      ...input.imageUrls.map((url) => ({ type: 'image_url', image_url: { url } } as const)),
    ];

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content },
    ];
  }

  private extractContent(payload: {
    choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }>;
  }) {
    const content = payload.choices?.[0]?.message?.content;
    if (typeof content === 'string') {
      return content;
    }

    if (Array.isArray(content)) {
      const text = content
        .map((part) => (part.type === 'text' ? part.text ?? '' : ''))
        .join('')
        .trim();
      if (text) return text;
    }

    throw new Error('Homework AI provider returned empty content');
  }

  private parseStructured(rawContent: string): HomeworkAnalysisStructuredResult {
    const parsed = JSON.parse(rawContent) as Partial<HomeworkAnalysisStructuredResult> & {
      errorItems?: Array<{ label?: string; code?: string; evidence?: string }>;
      accuracyPct?: number | string;
      confidence?: number | string;
    };

    const accuracyPct = Number(parsed.accuracyPct);
    if (!Number.isFinite(accuracyPct)) {
      throw new Error('Homework AI provider returned invalid accuracyPct');
    }

    const summary = parsed.summary?.toString().trim();
    const suggestion = parsed.suggestion?.toString().trim();
    if (!summary || !suggestion) {
      throw new Error('Homework AI provider returned incomplete summary/suggestion');
    }

    const errorItems = Array.isArray(parsed.errorItems)
      ? parsed.errorItems
        .map((item) => ({
          label: item.label?.toString().trim() ?? '',
          code: item.code?.toString().trim() || undefined,
          evidence: item.evidence?.toString().trim() || undefined,
        }))
        .filter((item) => item.label)
      : [];

    const confidenceValue = parsed.confidence === undefined ? undefined : Number(parsed.confidence);

    return {
      accuracyPct: Math.max(0, Math.min(100, Math.round(accuracyPct))),
      errorItems,
      summary,
      suggestion,
      confidence: Number.isFinite(confidenceValue) ? Math.max(0, Math.min(1, confidenceValue as number)) : undefined,
    };
  }

  private toMarkdown(
    input: HomeworkAnalysisAdapterInput,
    structured: HomeworkAnalysisStructuredResult,
    rawJson: string,
  ) {
    const lines = [
      '# Homework Analysis',
      `- submissionId: ${input.submissionId}`,
      `- subject: ${input.subject}`,
      `- promptVersion: ${input.promptVersion}`,
      `- accuracyPct: ${structured.accuracyPct}`,
      `- confidence: ${structured.confidence ?? 'n/a'}`,
      '',
      '## Summary',
      structured.summary,
      '',
      '## Suggestion',
      structured.suggestion,
    ];

    if (structured.errorItems.length) {
      lines.push('', '## Error Items');
      for (const item of structured.errorItems) {
        lines.push(`- ${item.label}${item.code ? ` (${item.code})` : ''}${item.evidence ? `: ${item.evidence}` : ''}`);
      }
    }

    lines.push('', '## Raw JSON', '```json', rawJson, '```');
    return lines.join('\n');
  }
}
