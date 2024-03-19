import { generateState } from 'arctic';
import { auth0 } from '../../../../lib/auth';

import type { APIContext } from 'astro';

export async function GET(context: APIContext): Promise<Response> {
  const state = generateState();
  const url = await auth0.createAuthorizationURL(state, {
    scopes: ['profile', 'email'],
  });

  context.cookies.set('auth0_oauth_state', state, {
    path: '/',
    secure: import.meta.env.PROD,
    httpOnly: true,
    maxAge: 60 * 10,
    sameSite: 'lax',
  });

  return context.redirect(url.toString());
}
