import { describe, expect, it } from 'vitest';
import { InMemoryAdapter, SqliteAdapter } from '../src/db.js';

describe('DB adapters', () => {
  it('supports sqlite local dev adapter', () => {
    const db = new SqliteAdapter();
    db.execute('CREATE TABLE events (id TEXT PRIMARY KEY, name TEXT NOT NULL)');
    db.execute('INSERT INTO events (id, name) VALUES (?, ?)', ['1', 'created']);

    const rows = db.query<{ id: string; name: string }>('SELECT * FROM events');
    expect(rows).toEqual([{ id: '1', name: 'created' }]);
  });

  it('supports in-memory mock adapter', () => {
    const db = new InMemoryAdapter();
    db.execute('CREATE TABLE events');
    db.execute('INSERT INTO events (id, name) VALUES (?, ?)', ['1', 'mocked']);

    const rows = db.query<{ id: string; name: string }>('SELECT * FROM events');
    expect(rows).toEqual([{ id: '1', name: 'mocked' }]);
  });
});
