import { writeFileSync } from 'node:fs';

function normalizeSql(sql) {
  return String(sql ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

export class Client {
  constructor(options = {}) {
    this.options = options;
    this.operations = [];
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

    return {
      rowCount: 1,
      rows: [],
    };
  }

  async end() {
    this.operations.push({ type: 'end' });
    if (process.env.PG_STUB_LOG_FILE) {
      writeFileSync(process.env.PG_STUB_LOG_FILE, JSON.stringify(this.operations, null, 2));
    }
  }
}
