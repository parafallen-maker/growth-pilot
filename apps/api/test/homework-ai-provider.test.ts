import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import {
  resolveHomeworkAiProvider,
  resolveHomeworkModelName,
  resolveHomeworkPromptVersion,
  resolveHomeworkProviderLabel,
  resolveOpenAiCompatibleApiKey,
  resolveOpenAiCompatibleBaseUrl,
} from '../src/modules/homework/adapter/homework-analysis-config';
import { OpenAiCompatibleHomeworkAnalysisAdapter } from '../src/modules/homework/adapter/openai-compatible-homework-analysis.adapter';

function withEnv<T>(patch: Record<string, string | undefined>, run: () => Promise<T> | T) {
  const previous = Object.fromEntries(Object.keys(patch).map((key) => [key, process.env[key]]));
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  return Promise.resolve()
    .then(run)
    .finally(() => {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    });
}

test('homework AI config falls back to mock and default model values', () => {
  assert.equal(resolveHomeworkAiProvider(undefined), 'mock');
  assert.equal(resolveHomeworkAiProvider('mock'), 'mock');
  assert.equal(resolveHomeworkAiProvider('openai'), 'openai-compatible');
  assert.equal(resolveHomeworkAiProvider('doubao'), 'openai-compatible');
  assert.equal(resolveHomeworkProviderLabel('doubao'), 'doubao');
  assert.equal(resolveHomeworkModelName(undefined), 'gpt-4o-mini');
  assert.equal(resolveHomeworkPromptVersion(undefined), 'homework-review-v3');
  assert.equal(resolveOpenAiCompatibleBaseUrl(undefined), 'https://api.openai.com/v1');
  assert.equal(resolveOpenAiCompatibleApiKey(undefined), undefined);
  assert.throws(() => resolveHomeworkAiProvider('anthropic'));
});

test('openai-compatible homework adapter parses structured JSON response', async () => {
  let capturedAuthHeader = '';
  let capturedBody = '';

  const server = createServer((req, res) => {
    if (req.url !== '/chat/completions') {
      res.statusCode = 404;
      res.end('not found');
      return;
    }

    capturedAuthHeader = req.headers.authorization ?? '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      capturedBody += chunk;
    });
    req.on('end', () => {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({
        model: 'mock-openai-compatible-model',
        usage: {
          prompt_tokens: 321,
          completion_tokens: 123,
        },
        choices: [
          {
            message: {
              content: JSON.stringify({
                accuracyPct: 92,
                errorItems: [{ label: '审题偏差', code: 'READ', evidence: '应用题单位漏看' }],
                summary: '整体较好，应用题仍有审题问题。',
                suggestion: '先圈单位，再列式并复查。',
                confidence: 0.84,
              }),
            },
          },
        ],
      }));
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address();
  assert.ok(address && typeof address === 'object');

  try {
    await withEnv(
      {
        OPENAI_API_KEY: 'test-key',
        OPENAI_BASE_URL: `http://127.0.0.1:${address.port}`,
      },
      async () => {
        const adapter = new OpenAiCompatibleHomeworkAnalysisAdapter();
        const result = await adapter.analyze({
          submissionId: 'submission-001',
          subject: 'math',
          imageUrls: ['https://example.com/hw-1.jpg'],
          provider: 'openai',
          modelName: 'gpt-4o-mini',
          promptVersion: 'homework-review-v3',
        });

        assert.equal(result.structured.accuracyPct, 92);
        assert.equal(result.structured.errorItems[0]?.label, '审题偏差');
        assert.equal(result.structured.summary, '整体较好，应用题仍有审题问题。');
        assert.equal(result.meta?.modelVersion, 'mock-openai-compatible-model');
        assert.equal(result.meta?.inputTokens, 321);
        assert.equal(result.meta?.outputTokens, 123);
        assert.match(result.rawMarkdown, /Homework Analysis/);
      },
    );
  } finally {
    server.close();
  }

  assert.equal(capturedAuthHeader, 'Bearer test-key');
  assert.match(capturedBody, /gpt-4o-mini/);
  assert.match(capturedBody, /homework-review-v3/);
  assert.match(capturedBody, /image_url/);
});

test('openai-compatible homework adapter requires API key', async () => {
  await withEnv(
    {
      OPENAI_API_KEY: undefined,
      AI_API_KEY: undefined,
    },
    async () => {
      const adapter = new OpenAiCompatibleHomeworkAnalysisAdapter();
      await assert.rejects(() => adapter.analyze({
        submissionId: 'submission-001',
        subject: 'math',
        imageUrls: [],
        provider: 'openai',
        modelName: 'gpt-4o-mini',
        promptVersion: 'homework-review-v3',
      }));
    },
  );
});
