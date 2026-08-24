const { Pool } = require('pg');
const crypto = require('crypto');

const host = process.env.POSTGRES_HOST || 'localhost';
const port = process.env.POSTGRES_PORT || '5432';
const user = process.env.POSTGRES_USER || 'afrofade';
const password = process.env.POSTGRES_PASSWORD || 'afrofade_secret_password';
const database = process.env.POSTGRES_DB || 'afrofade_db';

const connectionString =
  process.env.DATABASE_URL ||
  `postgresql://${user}:${password}@${host}:${port}/${database}`;

async function main() {
  const pool = new Pool({ connectionString });
  const targetEmail = 'sokevin7@gmail.com';

  console.log(`Setting admin role for ${targetEmail}...`);

  try {
    let userRes = await pool.query('SELECT id, email FROM auth.users WHERE email = $1', [targetEmail]);
    let userId;

    if (userRes.rows.length === 0) {
      userId = crypto.randomUUID();
      await pool.query(
        `INSERT INTO auth.users (id, email, created_at)
         VALUES ($1, $2, NOW())`,
        [userId, targetEmail]
      );
      console.log(`Created auth.users record for ${targetEmail} with ID: ${userId}`);
    } else {
      userId = userRes.rows[0].id;
      console.log(`Found existing auth.users record for ${targetEmail} with ID: ${userId}`);
    }

    // Insert or Update public.user_profiles
    const profileRes = await pool.query(
      `INSERT INTO public.user_profiles (user_id, role, display_name, full_name, updated_at) 
       VALUES ($1, 'admin', 'Kevin Sokevin', 'Kevin Sokevin', NOW()) 
       ON CONFLICT (user_id) DO UPDATE SET role = 'admin', updated_at = NOW() 
       RETURNING *`,
      [userId]
    );
    console.log('✅ SUCCESS: Profile updated with ADMIN role:', profileRes.rows[0]);

    // Install automatic trigger so any future signups with sokevin7@gmail.com instantly become admin
    await pool.query(`
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
    console.log('✅ SUCCESS: Automatic admin promotion trigger installed for sokevin7@gmail.com!');

  } catch (error) {
    console.error('Error during admin promotion:', error);
  } finally {
    await pool.end();
  }
}

main();
