#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

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

const args = parseArgs(process.argv.slice(2));
const dryRun = Boolean(args['dry-run']);
const batchId = args.batchId ?? `BATCH-${new Date().toISOString().slice(0, 10)}`;
const inputPath = args.input ? path.resolve(process.cwd(), String(args.input)) : null;
const sourceSystem = args.sourceSystem ?? inferSourceSystem(inputPath) ?? 'excel';
const sourceFile = args.sourceFile ?? (inputPath ? path.basename(inputPath) : 'mock-history.xlsx');
const artifactDir = args.artifactDir
  ? path.resolve(process.cwd(), String(args.artifactDir))
  : path.resolve(process.cwd(), 'artifacts', 'migration', batchId);

const sourceRows = inputPath ? loadRowsFromInput(inputPath) : buildMockSourceRows();
const rawRows = sourceRows.map((row, index) => toRawRow(row, index + 2, batchId, sourceSystem, sourceFile));
const normalizedRows = rawRows.map((row) => normalizeRow(row));
const rejects = normalizedRows.flatMap((row) => row.rejects);
const finalLoadPlan = buildFinalLoadPlan(normalizedRows);
const summary = buildSummary({
  batchId,
  sourceSystem,
  sourceFile,
  inputPath,
  dryRun,
  rawRows,
  normalizedRows,
  rejects,
  finalLoadPlan,
});
const artifacts = writeArtifacts({ artifactDir, summary, normalizedRows, rejects });

console.log(JSON.stringify({ ...summary, artifacts }, null, 2));

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

function inferSourceSystem(inputPathValue) {
  if (!inputPathValue) return null;
  const ext = path.extname(inputPathValue).toLowerCase();
  if (ext === '.csv') return 'csv';
  if (ext === '.json') return 'json';
  return null;
}

function loadRowsFromInput(inputPathValue) {
  const ext = path.extname(inputPathValue).toLowerCase();
  const content = readFileSync(inputPathValue, 'utf8');
  if (ext === '.json') {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) {
      throw new Error('JSON input must be an array of row objects');
    }
    return parsed.map((row, index) => normalizeImportedRow(row, index + 2));
  }
  if (ext === '.csv') {
    return parseCsv(content).map((row, index) => normalizeImportedRow(row, index + 2));
  }
  throw new Error(`Unsupported input extension: ${ext || '<none>'}. Use .json or .csv`);
}

function normalizeImportedRow(row, sourceRowNo) {
  const payload = { ...row };
  if (!payload.sourcePk) {
    payload.sourcePk = `row-${sourceRowNo}`;
  }
  if (!payload.sourceSheet) {
    payload.sourceSheet = 'imported';
  }
  if (!payload.targetDomain) {
    payload.targetDomain = inferTargetDomain(payload);
  }
  return payload;
}

function inferTargetDomain(payload) {
  if (payload.invoiceNo || payload.contractNo) return 'billing';
  if (payload.subjectRaw || payload.homeworkDateRaw || payload.errorTaxonomyRaw) return 'homework';
  return 'students';
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
          totalAmountCents: normalizeInt(payload.totalAmountCents),
          discountAmountCents: normalizeInt(payload.discountAmountCents),
          payableAmountCents: normalizeInt(payload.payableAmountCents),
          invoiceItemsAmountCents: normalizeInt(payload.invoiceItemsAmountCents),
          paymentsAmountCents: normalizeInt(payload.paymentsAmountCents),
          refundsAmountCents: normalizeInt(payload.refundsAmountCents),
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
  };
}

function buildSummary(context) {
  return {
    batchId: context.batchId,
    sourceSystem: context.sourceSystem,
    sourceFile: context.sourceFile,
    inputPath: context.inputPath,
    mode: context.dryRun ? 'dry-run' : 'validation-artifact',
    plan: {
      strategy: ['raw staging', 'normalized staging', 'final load'],
      rawRows: context.rawRows.length,
      normalizedRows: context.normalizedRows.length,
      readyToLoadRows: context.normalizedRows.filter((row) => row.importStatus === 'ready_to_load').length,
      rejectedRows: context.normalizedRows.filter((row) => row.importStatus === 'rejected').length,
    },
    rejectsByCode: countBy(context.rejects, 'rejectCode'),
    finalLoadPlan: context.finalLoadPlan,
    rejectSamples: context.rejects,
  };
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

function normalizeInt(rawValue) {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return 0;
  }
  const value = Number(rawValue);
  return Number.isFinite(value) ? Math.trunc(value) : 0;
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
    const value = item[key];
    accumulator[value] = (accumulator[value] ?? 0) + 1;
    return accumulator;
  }, {});
}

function parseCsv(content) {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return headers.reduce((row, header, index) => {
      row[header] = cells[index] ?? '';
      return row;
    }, {});
  });
}

function parseCsvLine(line) {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
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
      cells.push(current);
      current = '';
      continue;
    }
    current += char;
  }

  cells.push(current);
  return cells;
}

function writeArtifacts({ artifactDir, summary, normalizedRows, rejects }) {
  mkdirSync(artifactDir, { recursive: true });
  const summaryPath = path.join(artifactDir, 'summary.json');
  const rejectReportPath = path.join(artifactDir, 'reject-report.csv');
  const validationReportPath = path.join(artifactDir, 'validation-report.md');
  const readyRowsPath = path.join(artifactDir, 'ready-to-load.json');

  writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  writeFileSync(rejectReportPath, renderRejectCsv(rejects));
  writeFileSync(validationReportPath, renderValidationMarkdown(summary));
  writeFileSync(
    readyRowsPath,
    JSON.stringify(
      normalizedRows
        .filter((row) => row.importStatus === 'ready_to_load')
        .map((row) => ({
          sourceRowRef: `${row.sourceSheet}#${row.sourceRowNo}`,
          businessKey: row.normalizedPayload.businessKey,
          targetDomain: row.normalizedPayload.targetDomain,
          normalizedPayload: row.normalizedPayload,
        })),
      null,
      2,
    ),
  );

  return {
    artifactDir,
    summaryPath,
    rejectReportPath,
    validationReportPath,
    readyRowsPath,
  };
}

function renderRejectCsv(rejects) {
  const headers = [
    'batch_id',
    'source_file',
    'source_sheet',
    'source_row_no',
    'target_domain',
    'reject_code',
    'reject_reason',
    'source_pk',
    'business_key',
    'field_name',
    'raw_value',
    'expected_rule',
    'suggested_action',
    'owner',
    'status',
  ];
  const rows = rejects.map((item) => [
    item.batchId,
    item.sourceFile,
    item.sourceSheet,
    item.sourceRowNo,
    item.targetDomain,
    item.rejectCode,
    item.rejectReason,
    item.sourcePk,
    item.businessKey,
    item.fieldName,
    item.rawValue,
    item.expectedRule,
    item.suggestedAction,
    item.owner,
    item.status,
  ]);
  return [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
}

function csvEscape(value) {
  const text = value === undefined || value === null ? '' : String(value);
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

function renderValidationMarkdown(summary) {
  const rejectLines = Object.entries(summary.rejectsByCode)
    .map(([code, count]) => `- ${code}: ${count}`)
    .join('\n') || '- 无 reject';
  const readyKeys = summary.finalLoadPlan.readyBusinessKeys.map((key) => `- ${key}`).join('\n') || '- 无';
  const samples = summary.rejectSamples.slice(0, 5).map((item) => [
    `### ${item.rejectCode}`,
    `- 来源：${item.sourceSheet}#${item.sourceRowNo}`,
    `- 业务键：${item.businessKey}`,
    `- 字段：${item.fieldName}`,
    `- 原因：${item.rejectReason}`,
    `- 建议：${item.suggestedAction}`,
    `- Owner：${item.owner}`,
  ].join('\n')).join('\n\n') || '### 无\n- 本批次无 reject';

  return [
    '# Migration Validation Report',
    '',
    `- batchId: ${summary.batchId}`,
    `- sourceSystem: ${summary.sourceSystem}`,
    `- sourceFile: ${summary.sourceFile}`,
    `- mode: ${summary.mode}`,
    `- inputPath: ${summary.inputPath ?? '(built-in mock batch)'}`,
    '',
    '## Plan 摘要',
    `- rawRows: ${summary.plan.rawRows}`,
    `- normalizedRows: ${summary.plan.normalizedRows}`,
    `- readyToLoadRows: ${summary.plan.readyToLoadRows}`,
    `- rejectedRows: ${summary.plan.rejectedRows}`,
    '',
    '## Ready To Load Business Keys',
    readyKeys,
    '',
    '## Reject 分类统计',
    rejectLines,
    '',
    '## Reject 样例',
    samples,
    '',
    '## Final Load Order',
    ...summary.finalLoadPlan.loadOrder.map((item, index) => `${index + 1}. ${item}`),
    '',
    '## 结论',
    summary.plan.rejectedRows > 0
      ? '- 本批次存在 reject，建议先修源数据/映射，再回放 final load。'
      : '- 本批次已满足 ready_to_load，可进入 final load/upsert 对接阶段。',
  ].join('\n');
}
