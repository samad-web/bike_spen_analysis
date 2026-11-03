import { CapacitorSQLite, SQLiteConnection, type SQLiteDBConnection } from "@capacitor-community/sqlite";

const DB_NAME = "motopulse.db";
const sqlite = new SQLiteConnection(CapacitorSQLite);
let db: SQLiteDBConnection | null = null;

const SCHEMA = `
create table if not exists outbox (
  id text primary key,            -- client-generated UUID (gap analysis #7)
  kind text not null,             -- 'save_expense'
  payload text not null,          -- JSON
  created_at text not null,
  attempts integer not null default 0,
  last_error text
);
create table if not exists cached_tags (
  token text primary key,
  vehicle_id text not null,
  status text not null
);
`;

/** Opens (or reuses) the on-device SQLite connection and ensures the schema exists. */
export async function getDb(): Promise<SQLiteDBConnection> {
  if (db) return db;
  const isConn = (await sqlite.isConnection(DB_NAME, false)).result;
  db = isConn
    ? await sqlite.retrieveConnection(DB_NAME, false)
    : await sqlite.createConnection(DB_NAME, false, "no-encryption", 1, false);
  await db.open();
  await db.execute(SCHEMA);
  return db;
}
