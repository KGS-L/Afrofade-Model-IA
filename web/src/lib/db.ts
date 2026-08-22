import { Pool, QueryResultRow } from 'pg';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://afrofade:afrofade_secret_pass@localhost:5432/afrofade_db';

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
