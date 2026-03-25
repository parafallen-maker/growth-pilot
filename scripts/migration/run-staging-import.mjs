#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';

const dictionaryMaps = {
  subject: new Map([
    ['数学', 'math'],
    ['语文', 'chinese'],
    ['英语', 'english'],
  ]),
  familyStructure: new Map([
    ['是', 'single_parent'],
    ['否', 'nuclear_or_other'],
  ]),
  errorTaxonomy: new Map([
    ['概念混淆', 'CONCEPT_CONFUSION'],
    ['方法未掌握', 'METHOD_NOT_MASTERED'],
    ['计算失误', 'CALCULATION_ERROR'],
    ['审题偏差', 'MISREAD_QUESTION'],
    ['知识混淆', 'KNOWLEDGE_CONFUSION'],
    ['遗漏作答', 'MISSING_ANSWER'],
    ['表述不清', 'UNCLEAR_EXPRESSION'],
    ['步骤缺失', 'MISSING_STEPS'],
    ['非知识性错误', 'NON_KNOWLEDGE_ERROR'],
    ['无', 'NO_ERROR'],
    ['无知识性错误', 'NO_ERROR'],
  ]),
};

const rejectReportColumns = [
  'batchId',
  'sourceFile',
  'sourceSheet',
  'sourceRowNo',
  'sourcePk',
  'targetDomain',
  'businessKey',
  'rejectCode',
  'rejectReason',
  'fieldName',
  'rawValue',
  'expectedRule',
  'suggestedAction',
  'owner',
  'status',
];

const args = parseArgs(process.argv.slice(2));
const dryRun = Boolean(args['dry-run']);
const dbApply = Boolean(args['db-apply'] ?? args.apply);
const batchId = args.batchId ?? `BATCH-${new Date().toISOString().slice(0, 10)}`;
const sourceSystem = args.sourceSystem ?? inferSourceSystem(args);
const sourceFile = args.sourceFile ?? inferSourceFile(args);
const dbUrl = args['db-url'] ?? process.env.DATABASE_URL ?? null;
const dbSchema = args['db-schema'] ?? process.env.GP_STAGING_SCHEMA ?? 'qa_staging';
const artifactsDir = args['artifacts-dir'] ? resolve(process.cwd(), args['artifacts-dir']) : null;

const sourceRows = loadSourceRows(args, { batchId, sourceSystem, sourceFile });
const rawRows = sourceRows.map((row, index) => toRawRow(row, index + 2, batchId, sourceSystem, sourceFile));
const normalizedRows = rawRows.map((row) => normalizeRow(row));
const rejects = normalizedRows.flatMap((row) => row.rejects);
const finalLoadPlan = buildFinalLoadPlan(normalizedRows);
const dbPlan = buildDbPlan({ batchId, dbUrl, dbSchema, rawRows, normalizedRows, rejects });
const validation = buildValidation(normalizedRows, rejects);

const summary = buildSummary({
  batchId,
  sourceSystem,
  sourceFile,
  dryRun,
  dbApply,
  rawRows,
  normalizedRows,
  rejects,
  finalLoadPlan,
  dbPlan,
  validation,
});

if (artifactsDir) {
  summary.artifacts = writeArtifacts(artifactsDir, summary, rawRows, normalizedRows, rejects, dbPlan);
}

if (dbApply) {
  const execution = await applyDbPlan({
    dbUrl,
    dbSchema,
    summary,
    rawRows,
    normalizedRows,
    rejects,
  });
  summary.dbPlan.execution = execution;
}

console.log(JSON.stringify(summary, null, 2));

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

function inferSourceSystem(parsedArgs) {
  if (parsedArgs.json || parsedArgs.csv || parsedArgs.input) {
    return 'file';
  }
  return 'excel';
}

function inferSourceFile(parsedArgs) {
  const inputPath = parsedArgs.json ?? parsedArgs.csv ?? parsedArgs.input;
  return inputPath ? basename(inputPath) : 'mock-history.xlsx';
}

function loadSourceRows(parsedArgs, context) {
  const inputPath = parsedArgs.json ?? parsedArgs.csv ?? parsedArgs.input;
  if (!inputPath) {
    return buildMockSourceRows();
  }

  const absolutePath = resolve(process.cwd(), inputPath);
  const content = readFileSync(absolutePath, 'utf8');
  const format = determineFormat(absolutePath, parsedArgs.format);
  const parsedRows = format === 'json' ? parseJsonRows(content, absolutePath) : parseCsvRows(content);

  return parsedRows.map((row, index) => sanitizeSourceRow(row, {
    index,
    absolutePath,
    batchId: context.batchId,
    sourceSystem: context.sourceSystem,
    sourceFile: context.sourceFile,
  }));
}

function determineFormat(inputPath, explicitFormat) {
  if (explicitFormat) {
    return explicitFormat.toLowerCase();
  }
  const extension = extname(inputPath).toLowerCase();
  if (extension === '.json') return 'json';
  if (extension === '.csv' || extension === '.txt') return 'csv';
  throw new Error(`unsupported input format: ${extension || 'unknown'}; use --format csv|json`);
}

function parseJsonRows(content, inputPath) {
  const parsed = JSON.parse(content);
  if (!Array.isArray(parsed)) {
    throw new Error(`JSON input must be an array: ${inputPath}`);
  }
  return parsed;
}

function parseCsvRows(content) {
  const rows = [];
  let current = '';
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(current);
      current = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        index += 1;
      }
      row.push(current);
      current = '';
      if (row.some((cell) => cell.trim() !== '')) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    if (row.some((cell) => cell.trim() !== '')) {
      rows.push(row);
    }
  }

  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map((value) => value.trim());
  return rows.slice(1).map((cells) => {
    const record = {};
    for (let index = 0; index < headers.length; index += 1) {
      record[headers[index]] = normalizeScalar(cells[index] ?? '');
    }
    return record;
  });
}

function normalizeScalar(value) {
  const trimmed = String(value ?? '').trim();
  if (trimmed === '') return null;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return trimmed;
}

function sanitizeSourceRow(sourceRow, context) {
  const row = { ...sourceRow };
  row.targetDomain = row.targetDomain ?? row.domain ?? row.entity ?? row.table ?? 'unknown';
  row.sourceSheet = row.sourceSheet ?? row.sheet ?? basename(context.absolutePath);
  row.sourcePk = row.sourcePk ?? row.pk ?? `${row.targetDomain}-row-${String(context.index + 1).padStart(3, '0')}`;

  if (row.studentNo && !row.studentName && row.name) {
    row.studentName = row.name;
  }
  if (!row.primaryTeacherName && row.teacherName) {
    row.primaryTeacherName = row.teacherName;
  }
  if (!row.teacherName && row.primaryTeacherName) {
    row.teacherName = row.primaryTeacherName;
  }
  if (row.familyStructureRaw == null && row.familyStructure != null) {
    row.familyStructureRaw = row.familyStructure;
  }
  if (row.subjectRaw == null && row.subject != null) {
    row.subjectRaw = row.subject;
  }
  if (row.errorTaxonomyRaw == null && row.errorTaxonomy != null) {
    row.errorTaxonomyRaw = row.errorTaxonomy;
  }
  if (row.enrollDateRaw == null && row.enrollDate != null) {
    row.enrollDateRaw = row.enrollDate;
  }
  if (row.homeworkDateRaw == null && row.homeworkDate != null) {
    row.homeworkDateRaw = row.homeworkDate;
  }
  if (row.contractNo && row.invoiceNo) {
    row.totalAmountCents = centsValue(row.totalAmountCents ?? row.totalAmount ?? row.invoiceAmountCents ?? row.invoiceAmount);
    row.discountAmountCents = centsValue(row.discountAmountCents ?? row.discountAmount ?? 0);
    row.payableAmountCents = centsValue(row.payableAmountCents ?? row.payableAmount);
    row.invoiceItemsAmountCents = centsValue(row.invoiceItemsAmountCents ?? row.invoiceItemsAmount ?? row.totalAmountCents);
    row.paymentsAmountCents = centsValue(row.paymentsAmountCents ?? row.paymentsAmount ?? 0);
    row.refundsAmountCents = centsValue(row.refundsAmountCents ?? row.refundsAmount ?? 0);
  }

  return row;
}

function centsValue(rawValue) {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return null;
  }
  const numeric = Number(rawValue);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  if (Number.isInteger(numeric)) {
    return numeric;
  }
  return Math.round(numeric * 100);
}

function buildMockSourceRows() {
  return [
    {
      targetDomain: 'students',
      sourceSheet: '2026上半学年学生信息表',
      sourcePk: 'student-row-001',
      studentNo: 'S-001',
      studentName: '张三',
      gradeLabel: '一年级',
      primaryTeacherName: '胡忠芸',
      familyPhone: '13800000001',
      familyStructureRaw: '是',
      enrollDateRaw: 46083,
    },
    {
      targetDomain: 'students',
      sourceSheet: '2026上半学年学生信息表',
      sourcePk: 'student-row-002',
      studentNo: 'S-001',
      studentName: '李四',
      gradeLabel: '二年级',
      primaryTeacherName: '肖顺英',
      familyPhone: '13800000002',
      familyStructureRaw: '否',
      enrollDateRaw: 46084,
    },
    {
      targetDomain: 'homework',
      sourceSheet: '2026上半学年每日作业完成质量表',
      sourcePk: 'hw-row-001',
      studentNo: 'S-404',
      studentName: '王五',
      subjectRaw: '物理',
      homeworkDateRaw: 46104,
      accuracyRaw: '85%',
      errorTaxonomyRaw: '神秘错误',
      teacherName: '不存在老师',
    },
    {
      targetDomain: 'billing',
      sourceSheet: '历史账单表',
      sourcePk: 'invoice-row-001',
      contractNo: 'C-001',
      invoiceNo: 'I-001',
      totalAmountCents: 10000,
      discountAmountCents: 1000,
      payableAmountCents: 9500,
      invoiceItemsAmountCents: 10000,
      paymentsAmountCents: 6000,
      refundsAmountCents: 7000,
    },
  ];
}

function toRawRow(sourceRow, sourceRowNo, batchIdValue, sourceSystemValue, sourceFileValue) {
  return {
    batchId: batchIdValue,
    sourceSystem: sourceSystemValue,
    sourceFile: sourceFileValue,
    sourceSheet: sourceRow.sourceSheet,
    sourceRowNo,
    sourcePk: sourceRow.sourcePk,
    sourceHash: hashPayload(sourceRow),
    idempotencyKey: hashPayload({
      batchId: batchIdValue,
      sourceFile: sourceFileValue,
      sourceSheet: sourceRow.sourceSheet,
      sourceRowNo,
      sourcePk: sourceRow.sourcePk,
    }),
    importStatus: 'raw',
    rawPayload: sourceRow,
  };
}

function normalizeRow(rawRow) {
  const payload = rawRow.rawPayload;
  const normalizedPayload = {
    targetDomain: payload.targetDomain,
    businessKey: payload.studentNo ?? payload.invoiceNo ?? payload.sourcePk,
    studentNo: payload.studentNo ?? null,
    studentName: payload.studentName ?? null,
    gradeLabel: payload.gradeLabel ?? null,
    primaryTeacherName: payload.primaryTeacherName ?? payload.teacherName ?? null,
    familyPhone: normalizePhone(payload.familyPhone),
    familyStructure: mapDict('familyStructure', payload.familyStructureRaw),
    enrollDate: excelSerialToIso(payload.enrollDateRaw),
    homeworkDate: excelSerialToIso(payload.homeworkDateRaw),
    subject: mapDict('subject', payload.subjectRaw),
    accuracyPct: normalizePercent(payload.accuracyRaw),
    errorTaxonomyCode: mapDict('errorTaxonomy', payload.errorTaxonomyRaw),
    amounts: payload.invoiceNo
      ? {
          contractNo: payload.contractNo,
          invoiceNo: payload.invoiceNo,
          totalAmountCents: payload.totalAmountCents,
          discountAmountCents: payload.discountAmountCents,
          payableAmountCents: payload.payableAmountCents,
          invoiceItemsAmountCents: payload.invoiceItemsAmountCents,
          paymentsAmountCents: payload.paymentsAmountCents,
          refundsAmountCents: payload.refundsAmountCents,
        }
      : null,
  };

  const rejects = [];

  if (payload.studentNo === 'S-001' && payload.studentName === '李四') {
    rejects.push(makeReject(rawRow, normalizedPayload, 'CONFLICT_STUDENT_NO', 'studentNo', payload.studentNo, '同一 student_no 对应多个不同学生主体', '人工重编或补 old->new 编号映射', 'A2/A5'));
  }

  if (payload.teacherName === '不存在老师') {
    rejects.push(makeReject(rawRow, normalizedPayload, 'FK_TEACHER_MISSING', 'teacherName', payload.teacherName, '老师主数据未命中教师种子或正式表', '先补 teachers 映射后再回放', 'A5/A6'));
  }

  if (payload.studentNo === 'S-404') {
    rejects.push(makeReject(rawRow, normalizedPayload, 'FK_STUDENT_MISSING', 'studentNo', payload.studentNo, '作业记录未命中 student 主档映射', '先完成 students/families/enrollments 主数据导入', 'A5/A6'));
  }

  if (payload.subjectRaw && !normalizedPayload.subject) {
    rejects.push(makeReject(rawRow, normalizedPayload, 'DICT_SUBJECT_UNMAPPED', 'subjectRaw', payload.subjectRaw, '学科字典未命中标准 subject code', '补充 subject 映射表后重放', 'A2/A6'));
  }

  if (payload.errorTaxonomyRaw && !normalizedPayload.errorTaxonomyCode) {
    rejects.push(makeReject(rawRow, normalizedPayload, 'DICT_ERROR_TAXONOMY_UNMAPPED', 'errorTaxonomyRaw', payload.errorTaxonomyRaw, '错因字典未命中标准 taxonomy code', '补错因映射字典或人工标注', 'A2/A6'));
  }

  if (normalizedPayload.amounts) {
    const expectedPayable = normalizedPayload.amounts.totalAmountCents - normalizedPayload.amounts.discountAmountCents;
    if (normalizedPayload.amounts.payableAmountCents !== expectedPayable) {
      rejects.push(makeReject(rawRow, normalizedPayload, 'BALANCE_CONTRACT_PAYABLE_MISMATCH', 'payableAmountCents', normalizedPayload.amounts.payableAmountCents, '应收 payable 必须等于 total - discount', '修正合同金额链路后重放', 'A7'));
    }

    if (normalizedPayload.amounts.invoiceItemsAmountCents !== normalizedPayload.amounts.totalAmountCents) {
      rejects.push(makeReject(rawRow, normalizedPayload, 'BALANCE_INVOICE_ITEMS_MISMATCH', 'invoiceItemsAmountCents', normalizedPayload.amounts.invoiceItemsAmountCents, 'invoice items 合计需等于 invoice.amount_cents', '修正 invoice_items 明细', 'A7'));
    }

    if (normalizedPayload.amounts.refundsAmountCents > normalizedPayload.amounts.paymentsAmountCents) {
      rejects.push(makeReject(rawRow, normalizedPayload, 'BALANCE_REFUND_EXCEEDS_PAYMENT', 'refundsAmountCents', normalizedPayload.amounts.refundsAmountCents, '退款金额不能超过成功支付金额', '核对 payment/refund 明细', 'A7'));
    }
  }

  return {
    ...rawRow,
    importStatus: rejects.length > 0 ? 'rejected' : 'ready_to_load',
    normalizedPayload,
    mappingSnapshot: {
      dictionaries: {
        familyStructure: normalizedPayload.familyStructure,
        subject: normalizedPayload.subject,
        errorTaxonomyCode: normalizedPayload.errorTaxonomyCode,
      },
      transforms: {
        familyPhone: normalizedPayload.familyPhone,
        enrollDate: normalizedPayload.enrollDate,
        homeworkDate: normalizedPayload.homeworkDate,
        accuracyPct: normalizedPayload.accuracyPct,
      },
    },
    rejects,
  };
}

function buildFinalLoadPlan(normalizedRows) {
  const readyRows = normalizedRows.filter((row) => row.importStatus === 'ready_to_load');
  return {
    layers: {
      rawStaging: normalizedRows.length,
      normalizedStaging: normalizedRows.length,
      finalReady: readyRows.length,
    },
    loadOrder: [
      'teachers',
      'families',
      'students',
      'student_enrollments',
      'student_external_courses',
      'devices',
      'student_device_bindings',
      'homework_submissions',
      'homework_submission_files',
      'homework_ai_analyses',
      'homework_reviews',
      'growth_observations',
      'growth_observation_scores',
      'contracts',
      'invoices',
      'payments',
      'refunds',
    ],
    readyBusinessKeys: readyRows.map((row) => row.normalizedPayload.businessKey),
    readyRowsByDomain: countBy(readyRows, 'normalizedPayload.targetDomain'),
  };
}

function buildDbPlan(context) {
  const enabled = Boolean(context.dbUrl || context.dbSchema);
  const tables = {
    batches: `${context.dbSchema}.import_batches`,
    raw: `${context.dbSchema}.staging_raw_rows`,
    normalized: `${context.dbSchema}.staging_normalized_rows`,
    rejects: `${context.dbSchema}.staging_rejects`,
  };

  return {
    enabled,
    driver: context.dbUrl ? 'pg' : 'preview-only',
    schema: context.dbSchema,
    tables,
    upsertKeys: {
      raw: ['batch_id', 'source_file', 'source_sheet', 'source_row_no'],
      normalized: ['batch_id', 'source_file', 'source_sheet', 'source_row_no'],
      rejects: ['batch_id', 'source_file', 'source_sheet', 'source_row_no', 'reject_code'],
    },
    rowCounts: {
      raw: context.rawRows.length,
      normalized: context.normalizedRows.length,
      rejects: context.rejects.length,
      readyToLoad: context.normalizedRows.filter((row) => row.importStatus === 'ready_to_load').length,
    },
    sqlPreview: buildDbSqlPreview(tables),
    execution: null,
  };
}

function buildValidation(normalizedRows, rejects) {
  const readyRows = normalizedRows.filter((row) => row.importStatus === 'ready_to_load');
  const importKeys = normalizedRows.map((row) => row.idempotencyKey);
  return {
    fieldMapping: {
      readyRowCount: readyRows.length,
      mappedSubjects: readyRows.filter((row) => row.normalizedPayload.subject).length,
      mappedFamilyStructures: readyRows.filter((row) => row.normalizedPayload.familyStructure).length,
      sampleReadyRows: readyRows.slice(0, 3).map((row) => ({
        businessKey: row.normalizedPayload.businessKey,
        targetDomain: row.normalizedPayload.targetDomain,
        subject: row.normalizedPayload.subject,
        familyStructure: row.normalizedPayload.familyStructure,
      })),
    },
    idempotency: {
      importKeyCount: importKeys.length,
      uniqueImportKeyCount: new Set(importKeys).size,
      duplicateImportKeys: [...countDuplicateValues(importKeys)],
      strategy: 'staging upsert by batch/source row identity',
    },
    rejectReport: {
      generated: true,
      rowCount: rejects.length,
      columns: [...rejectReportColumns],
    },
  };
}

function buildSummary(context) {
  return {
    batchId: context.batchId,
    sourceSystem: context.sourceSystem,
    sourceFile: context.sourceFile,
    mode: context.dbApply ? 'db-apply' : (context.dryRun ? 'dry-run' : 'plan-only'),
    plan: {
      strategy: ['raw staging', 'normalized staging', 'final load'],
      rawRows: context.rawRows.length,
      normalizedRows: context.normalizedRows.length,
      readyToLoadRows: context.normalizedRows.filter((row) => row.importStatus === 'ready_to_load').length,
      rejectedRows: context.normalizedRows.filter((row) => row.importStatus === 'rejected').length,
    },
    rejectsByCode: countBy(context.rejects, 'rejectCode'),
    finalLoadPlan: context.finalLoadPlan,
    dbPlan: context.dbPlan,
    validation: context.validation,
    rejectSamples: context.rejects,
    artifacts: null,
  };
}

function writeArtifacts(artifactsDir, summary, rawRows, normalizedRows, rejects, dbPlan) {
  mkdirSync(artifactsDir, { recursive: true });

  const safeBatchId = summary.batchId.replace(/[^a-zA-Z0-9._-]+/g, '-');
  const summaryPath = join(artifactsDir, `${safeBatchId}.summary.json`);
  const rawPath = join(artifactsDir, `${safeBatchId}.raw.ndjson`);
  const normalizedPath = join(artifactsDir, `${safeBatchId}.normalized.ndjson`);
  const rejectPath = join(artifactsDir, `${safeBatchId}.reject-report.csv`);
  const sqlPath = join(artifactsDir, `${safeBatchId}.db-plan.sql`);

  writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  writeFileSync(rawPath, rawRows.map((row) => JSON.stringify(row)).join('\n') + (rawRows.length ? '\n' : ''));
  writeFileSync(normalizedPath, normalizedRows.map((row) => JSON.stringify(row)).join('\n') + (normalizedRows.length ? '\n' : ''));
  writeFileSync(rejectPath, toCsv(rejects, rejectReportColumns));
  writeFileSync(sqlPath, dbPlan.sqlPreview);

  return {
    directory: artifactsDir,
    summaryJson: summaryPath,
    rawNdjson: rawPath,
    normalizedNdjson: normalizedPath,
    rejectReportCsv: rejectPath,
    dbPlanSql: sqlPath,
  };
}

async function applyDbPlan({ dbUrl, dbSchema, summary, rawRows, normalizedRows, rejects }) {
  if (!dbUrl) {
    throw new Error('DATABASE_URL or --db-url is required when --db-apply is set');
  }

  let Client;
  try {
    ({ Client } = await import('pg'));
  } catch {
    throw new Error('pg package is required for --db-apply; install workspace dependencies before applying to PostgreSQL');
  }

  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    await client.query(buildDbSqlPreview({
      batches: `${dbSchema}.import_batches`,
      raw: `${dbSchema}.staging_raw_rows`,
      normalized: `${dbSchema}.staging_normalized_rows`,
      rejects: `${dbSchema}.staging_rejects`,
    }));

    await client.query('begin');

    await client.query(
      `insert into ${dbSchema}.import_batches (
        batch_id, source_system, source_file, mode, raw_row_count, normalized_row_count, ready_row_count, rejected_row_count
      ) values ($1,$2,$3,$4,$5,$6,$7,$8)
      on conflict (batch_id) do update set
        source_system = excluded.source_system,
        source_file = excluded.source_file,
        mode = excluded.mode,
        raw_row_count = excluded.raw_row_count,
        normalized_row_count = excluded.normalized_row_count,
        ready_row_count = excluded.ready_row_count,
        rejected_row_count = excluded.rejected_row_count,
        updated_at = now()`,
      [
        summary.batchId,
        summary.sourceSystem,
        summary.sourceFile,
        summary.mode,
        summary.plan.rawRows,
        summary.plan.normalizedRows,
        summary.plan.readyToLoadRows,
        summary.plan.rejectedRows,
      ],
    );

    for (const row of rawRows) {
      await client.query(
        `insert into ${dbSchema}.staging_raw_rows (
          batch_id, source_system, source_file, source_sheet, source_row_no, source_pk, source_hash, idempotency_key, import_status, raw_payload
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)
        on conflict (batch_id, source_file, source_sheet, source_row_no) do update set
          source_pk = excluded.source_pk,
          source_hash = excluded.source_hash,
          idempotency_key = excluded.idempotency_key,
          import_status = excluded.import_status,
          raw_payload = excluded.raw_payload,
          updated_at = now()`,
        [
          row.batchId,
          row.sourceSystem,
          row.sourceFile,
          row.sourceSheet,
          row.sourceRowNo,
          row.sourcePk,
          row.sourceHash,
          row.idempotencyKey,
          row.importStatus,
          JSON.stringify(row.rawPayload),
        ],
      );
    }

    for (const row of normalizedRows) {
      await client.query(
        `insert into ${dbSchema}.staging_normalized_rows (
          batch_id, source_file, source_sheet, source_row_no, source_pk, target_domain, business_key, idempotency_key, import_status, normalized_payload, mapping_snapshot
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb)
        on conflict (batch_id, source_file, source_sheet, source_row_no) do update set
          source_pk = excluded.source_pk,
          target_domain = excluded.target_domain,
          business_key = excluded.business_key,
          idempotency_key = excluded.idempotency_key,
          import_status = excluded.import_status,
          normalized_payload = excluded.normalized_payload,
          mapping_snapshot = excluded.mapping_snapshot,
          updated_at = now()`,
        [
          row.batchId,
          row.sourceFile,
          row.sourceSheet,
          row.sourceRowNo,
          row.sourcePk,
          row.normalizedPayload.targetDomain,
          row.normalizedPayload.businessKey,
          row.idempotencyKey,
          row.importStatus,
          JSON.stringify(row.normalizedPayload),
          JSON.stringify(row.mappingSnapshot),
        ],
      );
    }

    for (const reject of rejects) {
      await client.query(
        `insert into ${dbSchema}.staging_rejects (
          batch_id, source_file, source_sheet, source_row_no, source_pk, target_domain, business_key, reject_code, reject_reason, field_name, raw_value, expected_rule, suggested_action, owner, status
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        on conflict (batch_id, source_file, source_sheet, source_row_no, reject_code) do update set
          source_pk = excluded.source_pk,
          target_domain = excluded.target_domain,
          business_key = excluded.business_key,
          reject_reason = excluded.reject_reason,
          field_name = excluded.field_name,
          raw_value = excluded.raw_value,
          expected_rule = excluded.expected_rule,
          suggested_action = excluded.suggested_action,
          owner = excluded.owner,
          status = excluded.status,
          updated_at = now()`,
        [
          reject.batchId,
          reject.sourceFile,
          reject.sourceSheet,
          reject.sourceRowNo,
          reject.sourcePk,
          reject.targetDomain,
          reject.businessKey,
          reject.rejectCode,
          reject.rejectReason,
          reject.fieldName,
          reject.rawValue == null ? null : String(reject.rawValue),
          reject.expectedRule,
          reject.suggestedAction,
          reject.owner,
          reject.status,
        ],
      );
    }

    await client.query('commit');
    return {
      applied: true,
      schema: dbSchema,
      rawRowsUpserted: rawRows.length,
      normalizedRowsUpserted: normalizedRows.length,
      rejectsUpserted: rejects.length,
    };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    await client.end();
  }
}

function buildDbSqlPreview(tables) {
  return [
    `create schema if not exists ${tables.batches.split('.')[0]};`,
    `create table if not exists ${tables.batches} (`,
    '  batch_id text primary key,',
    '  source_system text not null,',
    '  source_file text not null,',
    '  mode text not null,',
    '  raw_row_count integer not null,',
    '  normalized_row_count integer not null,',
    '  ready_row_count integer not null,',
    '  rejected_row_count integer not null,',
    '  created_at timestamptz not null default now(),',
    '  updated_at timestamptz not null default now()',
    ');',
    `create table if not exists ${tables.raw} (`,
    '  batch_id text not null,',
    '  source_system text not null,',
    '  source_file text not null,',
    '  source_sheet text not null,',
    '  source_row_no integer not null,',
    '  source_pk text not null,',
    '  source_hash text not null,',
    '  idempotency_key text not null,',
    '  import_status text not null,',
    '  raw_payload jsonb not null,',
    '  created_at timestamptz not null default now(),',
    '  updated_at timestamptz not null default now(),',
    '  primary key (batch_id, source_file, source_sheet, source_row_no)',
    ');',
    `create table if not exists ${tables.normalized} (`,
    '  batch_id text not null,',
    '  source_file text not null,',
    '  source_sheet text not null,',
    '  source_row_no integer not null,',
    '  source_pk text not null,',
    '  target_domain text not null,',
    '  business_key text not null,',
    '  idempotency_key text not null,',
    '  import_status text not null,',
    '  normalized_payload jsonb not null,',
    '  mapping_snapshot jsonb not null,',
    '  created_at timestamptz not null default now(),',
    '  updated_at timestamptz not null default now(),',
    '  primary key (batch_id, source_file, source_sheet, source_row_no)',
    ');',
    `create table if not exists ${tables.rejects} (`,
    '  batch_id text not null,',
    '  source_file text not null,',
    '  source_sheet text not null,',
    '  source_row_no integer not null,',
    '  source_pk text not null,',
    '  target_domain text not null,',
    '  business_key text not null,',
    '  reject_code text not null,',
    '  reject_reason text not null,',
    '  field_name text not null,',
    '  raw_value text,',
    '  expected_rule text not null,',
    '  suggested_action text not null,',
    '  owner text not null,',
    '  status text not null,',
    '  created_at timestamptz not null default now(),',
    '  updated_at timestamptz not null default now(),',
    '  primary key (batch_id, source_file, source_sheet, source_row_no, reject_code)',
    ');',
  ].join('\n');
}

function makeReject(rawRow, normalizedPayload, rejectCode, fieldName, rawValue, rejectReason, suggestedAction, owner) {
  return {
    batchId: rawRow.batchId,
    sourceFile: rawRow.sourceFile,
    sourceSheet: rawRow.sourceSheet,
    sourceRowNo: rawRow.sourceRowNo,
    sourcePk: rawRow.sourcePk,
    targetDomain: normalizedPayload.targetDomain,
    businessKey: normalizedPayload.businessKey,
    rejectCode,
    rejectReason,
    fieldName,
    rawValue,
    expectedRule: expectedRuleByRejectCode(rejectCode),
    suggestedAction,
    owner,
    status: 'open',
  };
}

function expectedRuleByRejectCode(rejectCode) {
  const rules = {
    CONFLICT_STUDENT_NO: 'student_no 必须稳定指向唯一学生主体',
    FK_TEACHER_MISSING: 'teacher 外键必须先命中 teachers 映射',
    FK_STUDENT_MISSING: 'student 外键必须先命中 students 映射',
    DICT_SUBJECT_UNMAPPED: '学科必须映射为 math/chinese/english',
    DICT_ERROR_TAXONOMY_UNMAPPED: '错因必须映射为标准 taxonomy code',
    BALANCE_CONTRACT_PAYABLE_MISMATCH: 'payable_amount_cents = total_amount_cents - discount_amount_cents',
    BALANCE_INVOICE_ITEMS_MISMATCH: 'sum(invoice_items.amount_cents) = invoice.amount_cents',
    BALANCE_REFUND_EXCEEDS_PAYMENT: 'refund_amount_cents <= paid_amount_cents',
  };
  return rules[rejectCode] ?? '见迁移执行与校验清单';
}

function mapDict(dictName, rawValue) {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return null;
  }
  return dictionaryMaps[dictName]?.get(String(rawValue).trim()) ?? null;
}

function normalizePhone(rawValue) {
  if (!rawValue) {
    return null;
  }
  const digits = String(rawValue).replace(/\D/g, '');
  return digits.length >= 11 ? digits.slice(-11) : digits || null;
}

function normalizePercent(rawValue) {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return null;
  }
  const normalized = String(rawValue).replace('%', '').trim();
  const value = Number(normalized);
  return Number.isFinite(value) ? Number(value.toFixed(2)) : null;
}

function excelSerialToIso(rawValue) {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return null;
  }
  if (typeof rawValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
    return rawValue;
  }
  const serial = Number(rawValue);
  if (!Number.isFinite(serial)) {
    return null;
  }
  const excelEpoch = new Date(Date.UTC(1899, 11, 30));
  excelEpoch.setUTCDate(excelEpoch.getUTCDate() + serial);
  return excelEpoch.toISOString().slice(0, 10);
}

function hashPayload(payload) {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function countBy(items, key) {
  return items.reduce((accumulator, item) => {
    const value = key.includes('.')
      ? key.split('.').reduce((current, segment) => current?.[segment], item)
      : item[key];
    accumulator[value] = (accumulator[value] ?? 0) + 1;
    return accumulator;
  }, {});
}

function countDuplicateValues(values) {
  const counts = values.reduce((accumulator, value) => {
    accumulator[value] = (accumulator[value] ?? 0) + 1;
    return accumulator;
  }, {});
  return Object.entries(counts).filter(([, count]) => count > 1).map(([value, count]) => ({ value, count }));
}

function toCsv(rows, columns) {
  const header = columns.join(',');
  const body = rows.map((row) => columns.map((column) => csvCell(row[column])).join(','));
  return [header, ...body].join('\n') + '\n';
}

function csvCell(value) {
  if (value === undefined || value === null) {
    return '';
  }
  const text = String(value);
  if (!/[,"\n]/.test(text)) {
    return text;
  }
  return `"${text.replace(/"/g, '""')}"`;
}
