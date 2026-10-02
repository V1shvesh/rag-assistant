import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { SupabaseJwtService } from './supabase-jwt.service';
import { AuthenticatedRequest } from './auth.types';

function fakeContext(headers: Record<string, string> = {}): ExecutionContext {
  const request = { headers, user: undefined } as AuthenticatedRequest;
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('SupabaseAuthGuard', () => {
  let fakeJwtService: { verify: jest.Mock };
  let fakeReflector: { getAllAndOverride: jest.Mock };
  let guard: SupabaseAuthGuard;

  beforeEach(() => {
    fakeJwtService = { verify: jest.fn() };
    fakeReflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    guard = new SupabaseAuthGuard(
      fakeJwtService as unknown as SupabaseJwtService,
      fakeReflector as unknown as Reflector,
    );
  });

  it('allows a request through without verifying when the route is @Public()', async () => {
    fakeReflector.getAllAndOverride.mockReturnValue(true);
    const context = fakeContext();

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(fakeJwtService.verify).not.toHaveBeenCalled();
  });

  it('rejects a request with no Authorization header', async () => {
    const context = fakeContext();

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(fakeJwtService.verify).not.toHaveBeenCalled();
  });

  it('rejects a request with a malformed Authorization header', async () => {
    const context = fakeContext({ authorization: 'Token abc123' });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(fakeJwtService.verify).not.toHaveBeenCalled();
  });

  it('rejects a request when verification throws, without leaking the reason', async () => {
    fakeJwtService.verify.mockRejectedValue(
      new Error('JWSSignatureVerificationFailed'),
    );
    const context = fakeContext({ authorization: 'Bearer bad-token' });

    await expect(guard.canActivate(context)).rejects.toThrow(
      'Invalid or expired token',
    );
  });

  it('allows a request through and attaches the user on a valid token', async () => {
    const user = { id: 'user-123', email: 'a@b.com', role: 'authenticated' };
    fakeJwtService.verify.mockResolvedValue(user);
    const request = {
      headers: { authorization: 'Bearer good-token' },
    } as AuthenticatedRequest;
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual(user);
    expect(fakeJwtService.verify).toHaveBeenCalledWith('good-token');
  });
});
