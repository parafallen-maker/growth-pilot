import { existsSync, readFileSync, writeFileSync } from 'node:fs';

function normalizeSql(sql) {
  return String(sql ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function loadState(filePath) {
  if (!filePath || !existsSync(filePath)) {
    return { schemas: {} };
  }
  const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
  return parsed.state ?? parsed;
}

function emptySchemaState() {
  return {
    import_batches: [],
    staging_raw_rows: [],
    staging_normalized_rows: [],
    staging_rejects: [],
  };
}

function ensureSchema(state, schemaName) {
  if (!state.schemas[schemaName]) {
    state.schemas[schemaName] = emptySchemaState();
  }
  return state.schemas[schemaName];
}

function upsertRow(rows, keyFields, row) {
  const existingIndex = rows.findIndex((candidate) =>
    keyFields.every((key) => candidate[key] === row[key]),
  );

  if (existingIndex >= 0) {
    rows[existingIndex] = {
      ...rows[existingIndex],
      ...row,
    };
    return;
  }

  rows.push(row);
}

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

function registerSchemaObjects(state, normalizedSql) {
  const schemaMatches = [...normalizedSql.matchAll(/create schema if not exists ([a-z0-9_]+);/gi)];
  for (const match of schemaMatches) {
    ensureSchema(state, match[1]);
  }

  const tableMatches = [...normalizedSql.matchAll(/create table if not exists ([a-z0-9_]+)\.([a-z0-9_]+)/gi)];
  for (const match of tableMatches) {
    const [, schemaName, tableName] = match;
    const schemaState = ensureSchema(state, schemaName);
    if (!Array.isArray(schemaState[tableName])) {
      schemaState[tableName] = [];
    }
  }
}

export class Client {
  constructor(options = {}) {
    this.options = options;
    this.operations = [];
    this.stateFile = process.env.PG_STATE_FILE ?? null;
    this.state = loadState(this.stateFile);
    this.transactionSnapshot = null;
  }

  async connect() {
    this.operations.push({
      type: 'connect',
      connectionString: this.options.connectionString ?? null,
    });
  }

  async query(sql, params = []) {
    const normalizedSql = normalizeSql(sql);
    this.operations.push({
      type: 'query',
      sql: normalizedSql,
      params,
    });

    const failOn = process.env.PG_STUB_FAIL_ON;
    if (failOn && normalizedSql.includes(failOn)) {
      throw new Error(`stubbed pg query failure: ${failOn}`);
    }

    if (/^create schema if not exists /i.test(normalizedSql)) {
      registerSchemaObjects(this.state, normalizedSql);
      return { rowCount: 0, rows: [] };
    }

    if (normalizedSql === 'begin') {
      this.transactionSnapshot = cloneState(this.state);
      return { rowCount: 0, rows: [] };
    }

    if (normalizedSql === 'commit') {
      this.transactionSnapshot = null;
      return { rowCount: 0, rows: [] };
    }

    if (normalizedSql === 'rollback') {
      if (this.transactionSnapshot) {
        this.state = this.transactionSnapshot;
      }
      this.transactionSnapshot = null;
      return { rowCount: 0, rows: [] };
    }

    let match = /insert into ([a-z0-9_]+)\.import_batches/i.exec(normalizedSql);
    if (match) {
      const schemaState = ensureSchema(this.state, match[1]);
      upsertRow(schemaState.import_batches, ['batch_id'], {
        batch_id: params[0],
        source_system: params[1],
        source_file: params[2],
        mode: params[3],
        raw_row_count: params[4],
        normalized_row_count: params[5],
        ready_row_count: params[6],
        rejected_row_count: params[7],
      });
      return { rowCount: 1, rows: [] };
    }

    match = /insert into ([a-z0-9_]+)\.staging_raw_rows/i.exec(normalizedSql);
    if (match) {
      const schemaState = ensureSchema(this.state, match[1]);
      upsertRow(schemaState.staging_raw_rows, ['batch_id', 'source_file', 'source_sheet', 'source_row_no'], {
        batch_id: params[0],
        source_system: params[1],
        source_file: params[2],
        source_sheet: params[3],
        source_row_no: params[4],
        source_pk: params[5],
        source_hash: params[6],
        idempotency_key: params[7],
        import_status: params[8],
        raw_payload: JSON.parse(params[9]),
      });
      return { rowCount: 1, rows: [] };
    }

    match = /insert into ([a-z0-9_]+)\.staging_normalized_rows/i.exec(normalizedSql);
    if (match) {
      const schemaState = ensureSchema(this.state, match[1]);
      upsertRow(schemaState.staging_normalized_rows, ['batch_id', 'source_file', 'source_sheet', 'source_row_no'], {
        batch_id: params[0],
        source_file: params[1],
        source_sheet: params[2],
        source_row_no: params[3],
        source_pk: params[4],
        target_domain: params[5],
        business_key: params[6],
        idempotency_key: params[7],
        import_status: params[8],
        normalized_payload: JSON.parse(params[9]),
        mapping_snapshot: JSON.parse(params[10]),
      });
      return { rowCount: 1, rows: [] };
    }

    match = /insert into ([a-z0-9_]+)\.staging_rejects/i.exec(normalizedSql);
    if (match) {
      const schemaState = ensureSchema(this.state, match[1]);
      upsertRow(schemaState.staging_rejects, ['batch_id', 'source_file', 'source_sheet', 'source_row_no', 'reject_code'], {
        batch_id: params[0],
        source_file: params[1],
        source_sheet: params[2],
        source_row_no: params[3],
        source_pk: params[4],
        target_domain: params[5],
        business_key: params[6],
        reject_code: params[7],
        reject_reason: params[8],
        field_name: params[9],
        raw_value: params[10],
        expected_rule: params[11],
        suggested_action: params[12],
        owner: params[13],
        status: params[14],
      });
      return { rowCount: 1, rows: [] };
    }

    return {
      rowCount: 0,
      rows: [],
    };
  }

  async end() {
    this.operations.push({ type: 'end' });
    if (this.stateFile) {
      writeFileSync(this.stateFile, JSON.stringify({
        operations: this.operations,
        state: this.state,
      }, null, 2));
    }
  }
}
