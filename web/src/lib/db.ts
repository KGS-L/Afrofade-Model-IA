import { Pool, QueryResultRow } from 'pg';

const host = process.env.POSTGRES_HOST || 'localhost';
const port = process.env.POSTGRES_PORT || '5432';
const user = process.env.POSTGRES_USER || 'afrofade';
const password = process.env.POSTGRES_PASSWORD || 'afrofade_dev_pass';
const database = process.env.POSTGRES_DB || 'afrofade_dev';

const connectionString =
  process.env.DATABASE_URL ||
  `postgresql://${user}:${password}@${host}:${port}/${database}`;

let globalPool: Pool | null = null;

export function getDbPool(): Pool {
  if (!globalPool) {
    globalPool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return globalPool;
}

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
) {
  const pool = getDbPool();
  try {
    return await pool.query<T>(text, params);
  } catch (error) {
    console.error('[DB Query Error]', error, { text });
    throw error;
  }
}
