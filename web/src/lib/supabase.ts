import { query } from '@/lib/db';

class NativeDbQueryBuilder<T = any> {
  private tableName: string;
  private selectCols: string = '*';
  private whereClauses: { col: string; op: string; val: any }[] = [];
  private orderClauses: string[] = [];
  private limitVal?: number;
  private offsetVal?: number;
  private isSingle = false;
  private isMaybeSingle = false;
  private countMode?: string;
  private headOnly = false;
  private action: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
  private payloadData: any = null;
  private upsertOptions?: { onConflict?: string };

  constructor(table: string) {
    this.tableName = table;
  }

  select(cols: string = '*', opts?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }) {
    this.selectCols = cols === '*' ? '*' : cols;
    if (opts?.count) this.countMode = opts.count;
    if (opts?.head) this.headOnly = opts.head;
    return this;
  }

  eq(col: string, val: any) {
    if (val !== undefined) this.whereClauses.push({ col, op: '=', val });
    return this;
  }

  neq(col: string, val: any) {
    if (val !== undefined) this.whereClauses.push({ col, op: '!=', val });
    return this;
  }

  not(col: string, op: string, val: any) {
    if (val === null) {
      this.whereClauses.push({ col, op: 'IS NOT NULL', val: null });
    } else if (val !== undefined) {
      this.whereClauses.push({ col, op: '!=', val });
    }
    return this;
  }

  is(col: string, val: any) {
    if (val === null) {
      this.whereClauses.push({ col, op: 'IS NULL', val: null });
    } else if (val !== undefined) {
      this.whereClauses.push({ col, op: '=', val });
    }
    return this;
  }

  gt(col: string, val: any) {
    if (val !== undefined) this.whereClauses.push({ col, op: '>', val });
    return this;
  }

  gte(col: string, val: any) {
    if (val !== undefined) this.whereClauses.push({ col, op: '>=', val });
    return this;
  }

  lt(col: string, val: any) {
    if (val !== undefined) this.whereClauses.push({ col, op: '<', val });
    return this;
  }

  lte(col: string, val: any) {
    if (val !== undefined) this.whereClauses.push({ col, op: '<=', val });
    return this;
  }

  in(col: string, vals: any[]) {
    this.whereClauses.push({ col, op: 'IN', val: vals });
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    const dir = opts?.ascending === false ? 'DESC' : 'ASC';
    this.orderClauses.push(`"${col}" ${dir}`);
    return this;
  }

  limit(n: number) {
    this.limitVal = n;
    return this;
  }

  range(from: number, to: number) {
    this.offsetVal = from;
    this.limitVal = to - from + 1;
    return this;
  }

  single() {
    this.isSingle = true;
    this.limitVal = 1;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    this.limitVal = 1;
    return this;
  }

  insert(data: any) {
    this.action = 'insert';
    this.payloadData = data;
    return this;
  }

  update(data: any) {
    this.action = 'update';
    this.payloadData = data;
    return this;
  }

  upsert(data: any, opts?: { onConflict?: string }) {
    this.action = 'upsert';
    this.payloadData = data;
    this.upsertOptions = opts;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  async then(onfulfilled?: (value: { data: any; count?: number | null; error: any }) => any) {
    try {
      let resultData: any = null;
      let countVal: number | null = null;

      if (this.action === 'insert') {
        const records = Array.isArray(this.payloadData) ? this.payloadData : [this.payloadData];
        if (records.length === 0) return onfulfilled ? onfulfilled({ data: [], error: null }) : { data: [], error: null };

        const keys = Object.keys(records[0]);
        const columns = keys.map((k) => `"${k}"`).join(', ');
        const params: any[] = [];
        const valuesSql = records
          .map((rec) => {
            const rowParams = keys.map((k) => {
              params.push(rec[k]);
              return `$${params.length}`;
            });
            return `(${rowParams.join(', ')})`;
          })
          .join(', ');

        const sql = `INSERT INTO public."${this.tableName}" (${columns}) VALUES ${valuesSql} RETURNING *`;
        const res = await query(sql, params);
        resultData = this.isSingle || this.isMaybeSingle ? res.rows[0] || null : res.rows;
      } else if (this.action === 'update') {
        const keys = Object.keys(this.payloadData || {});
        if (keys.length === 0) return onfulfilled ? onfulfilled({ data: null, error: null }) : { data: null, error: null };

        const params: any[] = [];
        const setSql = keys
          .map((k) => {
            params.push(this.payloadData[k]);
            return `"${k}" = $${params.length}`;
          })
          .join(', ');

        const whereParts: string[] = [];
        for (const w of this.whereClauses) {
          if (w.op === 'IS NULL') {
            whereParts.push(`"${w.col}" IS NULL`);
          } else if (w.op === 'IS NOT NULL') {
            whereParts.push(`"${w.col}" IS NOT NULL`);
          } else {
            params.push(w.val);
            whereParts.push(`"${w.col}" = $${params.length}`);
          }
        }

        const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';
        const sql = `UPDATE public."${this.tableName}" SET ${setSql} ${whereSql} RETURNING *`;

        const res = await query(sql, params);
        resultData = this.isSingle || this.isMaybeSingle ? res.rows[0] || null : res.rows;
      } else if (this.action === 'upsert') {
        const records = Array.isArray(this.payloadData) ? this.payloadData : [this.payloadData];
        if (records.length === 0) return onfulfilled ? onfulfilled({ data: [], error: null }) : { data: [], error: null };

        const conflictCol = this.upsertOptions?.onConflict || 'id';
        const keys = Object.keys(records[0]);
        const columns = keys.map((k) => `"${k}"`).join(', ');

        const params: any[] = [];
        const valuesSql = records
          .map((rec) => {
            const rowParams = keys.map((k) => {
              params.push(rec[k]);
              return `$${params.length}`;
            });
            return `(${rowParams.join(', ')})`;
          })
          .join(', ');

        const updateSet = keys
          .filter((k) => k !== conflictCol)
          .map((k) => `"${k}" = EXCLUDED."${k}"`)
          .join(', ');

        const sql = `INSERT INTO public."${this.tableName}" (${columns}) VALUES ${valuesSql}
                     ON CONFLICT ("${conflictCol}") DO UPDATE SET ${updateSet} RETURNING *`;
        const res = await query(sql, params);
        resultData = this.isSingle || this.isMaybeSingle ? res.rows[0] || null : res.rows;
      } else if (this.action === 'delete') {
        const params: any[] = [];
        const whereParts: string[] = [];
        for (const w of this.whereClauses) {
          if (w.op === 'IS NULL') {
            whereParts.push(`"${w.col}" IS NULL`);
          } else if (w.op === 'IS NOT NULL') {
            whereParts.push(`"${w.col}" IS NOT NULL`);
          } else {
            params.push(w.val);
            whereParts.push(`"${w.col}" = $${params.length}`);
          }
        }

        const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';
        const sql = `DELETE FROM public."${this.tableName}" ${whereSql} RETURNING *`;

        const res = await query(sql, params);
        resultData = res.rows;
      } else {
        // SELECT
        const params: any[] = [];
        const whereParts: string[] = [];

        for (const w of this.whereClauses) {
          if (w.op === 'IS NULL') {
            whereParts.push(`"${w.col}" IS NULL`);
          } else if (w.op === 'IS NOT NULL') {
            whereParts.push(`"${w.col}" IS NOT NULL`);
          } else if (w.op === 'IN' && Array.isArray(w.val)) {
            if (w.val.length === 0) {
              whereParts.push('1 = 0');
            } else {
              const inParams = w.val.map((v) => {
                params.push(v);
                return `$${params.length}`;
              });
              whereParts.push(`"${w.col}" IN (${inParams.join(', ')})`);
            }
          } else {
            params.push(w.val);
            whereParts.push(`"${w.col}" ${w.op} $${params.length}`);
          }
        }

        const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';
        const orderSql = this.orderClauses.length ? `ORDER BY ${this.orderClauses.join(', ')}` : '';
        const limitSql = this.limitVal ? `LIMIT ${this.limitVal}` : '';
        const offsetSql = this.offsetVal ? `OFFSET ${this.offsetVal}` : '';

        if (this.countMode) {
          const countSql = `SELECT COUNT(*) AS total FROM public."${this.tableName}" ${whereSql}`;
          const countRes = await query(countSql, params);
          countVal = parseInt(countRes.rows[0]?.total || '0', 10);
        }

        if (this.headOnly) {
          resultData = [];
        } else {
          const sql = `SELECT ${this.selectCols === '*' ? '*' : this.selectCols} FROM public."${this.tableName}" ${whereSql} ${orderSql} ${limitSql} ${offsetSql}`;
          const res = await query(sql, params);
          const rows = res.rows;

          if (this.isSingle) {
            if (rows.length === 0) throw new Error(`Row not found in ${this.tableName}`);
            resultData = rows[0];
          } else if (this.isMaybeSingle) {
            resultData = rows[0] || null;
          } else {
            resultData = rows;
          }
        }
      }

      const resObj = { data: resultData, count: countVal, error: null };
      return onfulfilled ? onfulfilled(resObj) : resObj;
    } catch (error: any) {
      console.error(`[Native DB] Query error in ${this.tableName}:`, error);
      const errObj = { data: null, count: null, error: { message: error?.message || String(error) } as any };
      return onfulfilled ? onfulfilled(errObj) : errObj;
    }
  }
}

class NativeClient {
  from(table: string) {
    return new NativeDbQueryBuilder(table);
  }
  rpc(funcName: string, args?: any) {
    return (async () => {
      try {
        const keys = args ? Object.keys(args) : [];
        const params = keys.map((k) => args[k]);
        const paramPlaceholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const res = await query(`SELECT public.${funcName}(${paramPlaceholders})`, params);
        return { data: res.rows[0]?.[funcName] ?? res.rows, error: null };
      } catch (error: any) {
        return { data: null, error: { message: error?.message || String(error) } as any };
      }
    })();
  }
  storage = {
    from: (bucket: string) => ({
      upload: async (path: string, file: any, opts?: any) => ({ data: { path }, error: null as any }),
      uploadToSignedUrl: async (path: string, token: string, file: any, opts?: any) => ({ data: { path }, error: null as any }),
      createSignedUrl: async (path: string, expires?: number) => ({ data: { signedUrl: `/api/storage/read?path=${path}` }, error: null as any }),
      createSignedUploadUrl: async (path: string) => ({ data: { signedUrl: `/api/storage/upload?path=${path}`, path, token: 'token' }, error: null as any }),
      getPublicUrl: (path: string) => ({ data: { publicUrl: `/api/storage/read?path=${path}` } }),
      remove: async (paths: string[]) => ({ data: paths.map((p) => ({ name: p })), error: null as any }),
    }),
  };
  auth = {
    getUser: async () => ({ data: { user: null }, error: null as any }),
    getSession: async () => ({ data: { session: null }, error: null as any }),
  };
}

export const supabase = new NativeClient();
export function getServiceSupabase() {
  return new NativeClient();
}
export function getUserScopedClient(accessToken?: string) {
  return new NativeClient();
}
