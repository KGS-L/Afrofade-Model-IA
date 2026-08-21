/**
 * NextAuth.js / Auth.js Configuration for Self-Hosted Afrofade.
 * Manages sessions and OAuth/Email providers directly via PostgreSQL.
 */

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role: 'customer' | 'salon' | 'admin';
}

export interface NextAuthConfig {
  secret: string;
  databaseUrl: string;
  providers: {
    google?: {
      clientId: string;
      clientSecret: string;
    };
  };
}

export function getAuthConfig(): NextAuthConfig {
  return {
    secret: process.env.NEXTAUTH_SECRET || 'afrofade_dev_nextauth_secret',
    databaseUrl: process.env.DATABASE_URL || 'postgresql://afrofade:afrofade_secret_pass@localhost:5432/afrofade_db',
    providers: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      },
    },
  };
}

export function formatAuthHeader(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
  };
}
