import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';
import { AuthenticatedUser } from './auth.types';

@Injectable()
export class SupabaseJwtService {
  private readonly issuer: string;
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(config: ConfigService) {
    const supabaseUrl = config.getOrThrow<string>('SUPABASE_URL');
    this.issuer = `${supabaseUrl}/auth/v1`;
    this.jwks = createRemoteJWKSet(
      new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`),
    );
  }

  // Lets jose's verification errors (expired, bad signature, unknown kid,
  // etc.) propagate as-is. The guard is responsible for catching them,
  // logging the real reason server-side, and returning a generic 401 to
  // the client — this method must not decide how much detail is safe to
  // leak, since it has no view of who's asking.
  async verify(token: string): Promise<AuthenticatedUser> {
    const { payload }: { payload: JWTPayload } = await jwtVerify(
      token,
      this.jwks,
      { issuer: this.issuer, algorithms: ['ES256'] },
    );

    if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
      throw new UnauthorizedException('Token is missing a subject claim');
    }

    return {
      id: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      role: typeof payload.role === 'string' ? payload.role : undefined,
    };
  }
}
