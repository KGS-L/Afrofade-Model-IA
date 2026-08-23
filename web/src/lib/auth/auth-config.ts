/**
 * NextAuth.js / Self-Hosted JWT Auth Configuration for Afrofade.
 * Manages sessions and JWT tokens directly via local PostgreSQL and Jose.
 */

import { SignJWT, jwtVerify } from 'jose';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role: 'customer' | 'salon' | 'admin';
  salonId?: string | null;
}

export interface NextAuthConfig {
  secret: string;
  databaseUrl: string;
  jwtExpiration: string;
}

export function getAuthConfig(): NextAuthConfig {
  const host = process.env.POSTGRES_HOST || 'localhost';
  const port = process.env.POSTGRES_PORT || '5432';
  const user = process.env.POSTGRES_USER || 'afrofade';
  const password = process.env.POSTGRES_PASSWORD || 'afrofade_dev_pass';
  const database = process.env.POSTGRES_DB || 'afrofade_dev';

  return {
    secret: process.env.NEXTAUTH_SECRET || 'afrofade_dev_nextauth_secret',
    databaseUrl:
      process.env.DATABASE_URL ||
      `postgresql://${user}:${password}@${host}:${port}/${database}`,
    jwtExpiration: '7d',
  };
}

function getSecretKey(): Uint8Array {
  const secret = getAuthConfig().secret;
  return new TextEncoder().encode(secret);
}

export async function createSessionJwt(user: AuthUser): Promise<string> {
  const secretKey = getSecretKey();
  return new SignJWT({
    sub: user.id,
    email: user.email,
    name: user.name || user.email.split('@')[0],
    role: user.role,
    salonId: user.salonId || null,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey);
}

export async function verifySessionJwt(token: string): Promise<AuthUser | null> {
  try {
    const secretKey = getSecretKey();
    const { payload } = await jwtVerify(token, secretKey, { algorithms: ['HS256'] });
    
    if (!payload.sub || !payload.email) return null;

    return {
      id: payload.sub as string,
      email: payload.email as string,
      name: (payload.name as string) || (payload.email as string).split('@')[0],
      role: (payload.role as 'customer' | 'salon' | 'admin') || 'customer',
      salonId: (payload.salonId as string) || null,
    };
  } catch (error) {
    return null;
  }
}

export function formatAuthHeader(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
  };
}
