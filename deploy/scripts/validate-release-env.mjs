#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = parseArgs(process.argv.slice(2));
const mode = String(args.mode ?? 'prod').toLowerCase();
const envFile = args['env-file'] ? resolve(process.cwd(), args['env-file']) : null;
const env = envFile ? loadEnvFile(envFile) : { ...process.env };

const requiredKeys = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_SECRET',
  'JWT_ACCESS_TTL_SECONDS',
  'JWT_REFRESH_TTL_SECONDS',
  'S3_ENDPOINT',
  'S3_ACCESS_KEY',
  'S3_SECRET_KEY',
  'S3_BUCKET',
];

const recommendedKeys = ['NODE_ENV', 'CORS_ORIGIN', 'API_BASE_URL'];
const issues = [];
const warnings = [];

if (envFile && !existsSync(envFile)) {
  fail(`env file not found: ${envFile}`);
}

for (const key of requiredKeys) {
  const value = env[key];
  if (value == null || String(value).trim() === '') {
    issues.push(`${key} is required`);
  }
}

for (const key of recommendedKeys) {
  const value = env[key];
  if (value == null || String(value).trim() === '') {
    warnings.push(`${key} is recommended but missing`);
  }
}

if ((env.NODE_ENV ?? '').trim() && env.NODE_ENV !== 'production') {
  warnings.push(`NODE_ENV is ${env.NODE_ENV}; production should use production`);
}

if (env.DATABASE_URL && !/^postgres(ql)?:\/\//.test(env.DATABASE_URL)) {
  issues.push('DATABASE_URL must use postgres:// or postgresql://');
}

if (env.REDIS_URL && !/^redis:\/\//.test(env.REDIS_URL)) {
  issues.push('REDIS_URL must use redis://');
}

for (const key of ['JWT_ACCESS_TTL_SECONDS', 'JWT_REFRESH_TTL_SECONDS']) {
  if (env[key] && !/^\d+$/.test(String(env[key]).trim())) {
    issues.push(`${key} must be an integer number of seconds`);
  }
}

if (env.JWT_SECRET) {
  const jwtSecret = String(env.JWT_SECRET);
  if (jwtSecret.length < 64) {
    issues.push(`JWT_SECRET must be at least 64 characters; got ${jwtSecret.length}`);
  }
  if (containsPlaceholder(jwtSecret)) {
    issues.push('JWT_SECRET still contains an obvious placeholder or dev default');
  }
}

const placeholderChecks = [
  ['DATABASE_URL', ['gp_dev', 'STRONG_PASSWORD', 'growthpilot-dev']],
  ['S3_ACCESS_KEY', ['REPLACE', 'minioadmin']],
  ['S3_SECRET_KEY', ['REPLACE', 'minioadmin']],
  ['S3_BUCKET', ['growthpilot-dev', 'REPLACE']],
  ['CORS_ORIGIN', ['your-domain.com', 'localhost']],
  ['API_BASE_URL', ['your-domain.com', 'localhost']],
];

for (const [key, disallowedValues] of placeholderChecks) {
  const value = env[key];
  if (!value) {
    continue;
  }
  const normalized = String(value);
  if (disallowedValues.some((token) => normalized.includes(token))) {
    issues.push(`${key} still contains placeholder/dev value: ${normalized}`);
  }
}

if (mode === 'prod') {
  if (!env.CORS_ORIGIN) {
    issues.push('CORS_ORIGIN is required for prod validation');
  }
  if (!env.API_BASE_URL) {
    issues.push('API_BASE_URL is required for prod validation');
  }
}

const result = {
  mode,
  envSource: envFile ?? 'process.env',
  requiredKeysChecked: requiredKeys,
  recommendedKeysChecked: recommendedKeys,
  issues,
  warnings,
};

if (issues.length > 0) {
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(result, null, 2));
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      continue;
    }
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      parsed[key] = true;
      continue;
    }
    parsed[key] = next;
    index += 1;
  }
  return parsed;
}

function loadEnvFile(filePath) {
  const parsed = {};
  const content = readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    parsed[key] = value;
  }
  return parsed;
}

function containsPlaceholder(value) {
  return /REPLACE|CHANGE_ME|example|growthpilot-dev-secret|minioadmin/i.test(value);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
