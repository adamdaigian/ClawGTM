import { DatabaseSync } from 'node:sqlite';

export type DBPrimitive = string | number | boolean | null;
export type DBRow = Record<string, DBPrimitive>;

export interface DBAdapter {
  query<T extends DBRow = DBRow>(sql: string, params?: DBPrimitive[]): T[];
  execute(sql: string, params?: DBPrimitive[]): number;
  transaction<T>(fn: () => T): T;
}

export class SqliteAdapter implements DBAdapter {
  private readonly db: DatabaseSync;

  constructor(filename = ':memory:') {
    this.db = new DatabaseSync(filename);
    this.db.exec('PRAGMA foreign_keys = ON');
  }

  query<T extends DBRow = DBRow>(sql: string, params: DBPrimitive[] = []): T[] {
    return this.db.prepare(sql).all(...params) as T[];
  }

  execute(sql: string, params: DBPrimitive[] = []): number {
    const result = this.db.prepare(sql).run(...params);
    return Number(result.changes ?? 0);
  }

  transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN');
    try {
      const result = fn();
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
}

export class InMemoryAdapter implements DBAdapter {
  private readonly tables = new Map<string, DBRow[]>();

  query<T extends DBRow = DBRow>(sql: string): T[] {
    const normalized = sql.trim().toLowerCase();
    const match = normalized.match(/^select \* from ([a-z0-9_]+)$/);
    if (!match) {
      throw new Error(`InMemoryAdapter only supports 'SELECT * FROM <table>'. Received: ${sql}`);
    }
    const rows = this.tables.get(match[1]) ?? [];
    return rows.map((row) => ({ ...row })) as T[];
  }

  execute(sql: string, params: DBPrimitive[] = []): number {
    const normalized = sql.trim().toLowerCase();
    const createMatch = normalized.match(/^create table ([a-z0-9_]+)/);
    if (createMatch) {
      this.tables.set(createMatch[1], this.tables.get(createMatch[1]) ?? []);
      return 0;
    }

    const insertMatch = normalized.match(/^insert into ([a-z0-9_]+) \((.+)\) values \((.+)\)$/);
    if (insertMatch) {
      const table = insertMatch[1];
      const columns = insertMatch[2].split(',').map((column) => column.trim());
      const row: DBRow = {};
      columns.forEach((column, index) => {
        row[column] = params[index] ?? null;
      });
      const rows = this.tables.get(table) ?? [];
      rows.push(row);
      this.tables.set(table, rows);
      return 1;
    }

    throw new Error(`InMemoryAdapter cannot execute SQL: ${sql}`);
  }

  transaction<T>(fn: () => T): T {
    return fn();
  }
}

export class PostgresAdapterStub implements DBAdapter {
  query<T extends DBRow = DBRow>(_sql: string, _params: DBPrimitive[] = []): T[] {
    throw new Error('Postgres adapter wiring TODO: connect pg client and map rows.');
  }

  execute(_sql: string, _params: DBPrimitive[] = []): number {
    throw new Error('Postgres adapter wiring TODO: connect pg client and map changes.');
  }

  transaction<T>(_fn: () => T): T {
    throw new Error('Postgres adapter wiring TODO: wrap function in BEGIN/COMMIT/ROLLBACK.');
  }
}
