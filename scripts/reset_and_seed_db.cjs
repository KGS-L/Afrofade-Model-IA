const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const host = process.env.POSTGRES_HOST || 'localhost';
const port = process.env.POSTGRES_PORT || '5432';
const user = process.env.POSTGRES_USER || 'afrofade';
const password = process.env.POSTGRES_PASSWORD || 'afrofade_secret_password';
const database = process.env.POSTGRES_DB || 'afrofade_db';

const connectionString =
  process.env.DATABASE_URL ||
  `postgresql://${user}:${password}@${host}:${port}/${database}`;

async function resetAndSeedDatabase() {
  console.log('==> Resetting and Seeding Afrofade PostgreSQL Database...');
  const pool = new Pool({ connectionString });

  try {
    // 1. Drop existing schemas public and auth cleanly
    console.log('1. Dropping existing tables & schemas...');
    await pool.query(`
      DROP SCHEMA IF EXISTS public CASCADE;
      DROP SCHEMA IF EXISTS auth CASCADE;
      CREATE SCHEMA public;
      CREATE SCHEMA auth;
      CREATE TABLE IF NOT EXISTS auth.users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          raw_user_meta_data JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      INSERT INTO auth.users (id, email) VALUES
       ('00000000-0000-4000-8000-000000000001', 'demo@afrofade.dev'),
       ('00000000-0000-4000-8000-000000000002', 'karim@afrofade.dev'),
       ('00000000-0000-4000-8000-000000000003', 'fatou@afrofade.dev'),
       ('00000000-0000-4000-8000-000000000004', 'sylvain@afrofade.dev'),
       ('00000000-0000-4000-8000-000000000005', 'admin@afrofade.dev'),
       ('00000000-0000-4000-8000-000000000006', 'amina@afrofade.dev'),
       ('77777777-7777-4777-8777-777777777777', 'sokevin7@gmail.com')
      ON CONFLICT (id) DO NOTHING;
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$ SELECT NULL::UUID $$;
      CREATE OR REPLACE FUNCTION auth.role() RETURNS TEXT LANGUAGE sql STABLE AS $$ SELECT 'authenticated'::TEXT $$;
      CREATE SCHEMA IF NOT EXISTS storage;
      CREATE TABLE IF NOT EXISTS storage.buckets (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          public BOOLEAN DEFAULT FALSE,
          file_size_limit BIGINT,
          allowed_mime_types TEXT[]
      );
      CREATE TABLE IF NOT EXISTS storage.objects (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          bucket_id TEXT REFERENCES storage.buckets(id),
          name TEXT,
          owner UUID,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          metadata JSONB
      );
      GRANT ALL ON SCHEMA public TO public;
      GRANT ALL ON SCHEMA public TO ${user};
      GRANT ALL ON SCHEMA auth TO ${user};
    `);
    console.log('   Schema reset complete.');

    // 2. Read and apply migration files in order
    const migrationsDir = path.join(__dirname, '..', 'web', 'supabase', 'migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    console.log(`2. Applying ${files.length} SQL migrations...`);
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      console.log(`   -> Executing migration: ${file}`);
      const sql = fs.readFileSync(filePath, 'utf-8');
      await pool.query(sql);
    }
    console.log('   All migrations applied successfully.');

    // 3. Guarantee admin user sokevin7@gmail.com is present & has role = 'admin'
    console.log('3. Seeding Admin User sokevin7@gmail.com...');
    await pool.query(`
      INSERT INTO auth.users (id, email)
      VALUES ('77777777-7777-4777-8777-777777777777', 'sokevin7@gmail.com')
      ON CONFLICT (email) DO NOTHING;

      INSERT INTO public.user_profiles (user_id, email, role, display_name, full_name)
      SELECT id, email, 'admin', 'Kevin Sokevin', 'Kevin Sokevin'
      FROM auth.users
      WHERE email = 'sokevin7@gmail.com'
      ON CONFLICT (user_id) DO UPDATE SET role = 'admin', updated_at = NOW();

      -- Automatic trigger for any future logins
      CREATE OR REPLACE FUNCTION promote_sokevin_to_admin()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.email = 'sokevin7@gmail.com' THEN
          UPDATE public.user_profiles SET role = 'admin' WHERE user_id = NEW.id;
          IF NOT FOUND THEN
            INSERT INTO public.user_profiles (user_id, role, display_name, full_name)
            VALUES (NEW.id, 'admin', 'Kevin Sokevin', 'Kevin Sokevin');
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_promote_sokevin ON auth.users;
      CREATE TRIGGER trg_promote_sokevin
      AFTER INSERT OR UPDATE ON auth.users
      FOR EACH ROW EXECUTE FUNCTION promote_sokevin_to_admin();
    `);

    // Verify Admin User in user_profiles
    const checkAdmin = await pool.query(
      `SELECT up.*, u.email FROM public.user_profiles up JOIN auth.users u ON up.user_id = u.id WHERE u.email = 'sokevin7@gmail.com'`
    );
    console.log('   Verified Admin User Profile:', checkAdmin.rows[0]);
    console.log('[SUCCESS] DATABASE RESET & SEEDING COMPLETED 100%!');

  } catch (error) {
    console.error('[FAIL] Database reset / seeding error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

resetAndSeedDatabase();
