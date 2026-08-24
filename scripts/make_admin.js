const { Pool } = require('pg');

const host = process.env.POSTGRES_HOST || 'localhost';
const port = process.env.POSTGRES_PORT || '5432';
const user = process.env.POSTGRES_USER || 'afrofade';
const password = process.env.POSTGRES_PASSWORD || 'afrofade_dev_pass';
const database = process.env.POSTGRES_DB || 'afrofade_dev';

const connectionString =
  process.env.DATABASE_URL ||
  `postgresql://${user}:${password}@${host}:${port}/${database}`;

async function main() {
  const pool = new Pool({ connectionString });
  const email = 'sokevin7@gmail.com';

  console.log(`Searching user ${email} in database...`);

  try {
    // 1. Check auth.users table if it exists
    try {
      const authUserRes = await pool.query('SELECT id, email, raw_user_meta_data FROM auth.users WHERE email = $1', [email]);
      console.log('auth.users lookup:', authUserRes.rows);
      if (authUserRes.rows.length > 0) {
        const userId = authUserRes.rows[0].id;
        console.log(`Found auth user ID: ${userId}`);

        // Update user_profiles if table exists
        const upRes = await pool.query(
          `INSERT INTO public.user_profiles (user_id, role, updated_at) 
           VALUES ($1, 'admin', NOW()) 
           ON CONFLICT (user_id) DO UPDATE SET role = 'admin', updated_at = NOW() 
           RETURNING *`,
          [userId]
        );
        console.log('Updated public.user_profiles:', upRes.rows[0]);
      } else {
        console.log(`User ${email} not found in auth.users table directly.`);
      }
    } catch (err) {
      console.log('Error checking auth.users table:', err.message);
    }

    // 2. Also check if there's a custom users or user_profiles table directly with email
    try {
      const customUsers = await pool.query('SELECT * FROM public.user_profiles LIMIT 10');
      console.log('Sample user_profiles:', customUsers.rows);
    } catch (e) {
      console.log('Sample lookup error:', e.message);
    }

  } catch (error) {
    console.error('Database connection / query error:', error);
  } finally {
    await pool.end();
  }
}

main();
