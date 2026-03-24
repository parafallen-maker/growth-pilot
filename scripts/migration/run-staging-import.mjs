#!/usr/bin/env node

import { createHash } from 'node:crypto';

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
const sourceSystem = args.sourceSystem ?? 'excel';
const sourceFile = args.sourceFile ?? 'mock-history.xlsx';

const sourceRows = buildMockSourceRows();
const rawRows = sourceRows.map((row, index) => toRawRow(row, index + 2, batchId, sourceSystem, sourceFile));
const normalizedRows = rawRows.map((row) => normalizeRow(row));
const rejects = normalizedRows.flatMap((row) => row.rejects);
const finalLoadPlan = buildFinalLoadPlan(normalizedRows);
const summary = buildSummary({ batchId, sourceSystem, sourceFile, dryRun, rawRows, normalizedRows, rejects, finalLoadPlan });

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
    mode: context.dryRun ? 'dry-run' : 'plan-only',
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
