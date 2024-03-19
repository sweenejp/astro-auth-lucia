import { auth0, lucia } from '../../../../lib/auth';
import { OAuth2RequestError } from 'arctic';
import { db } from '../../../../lib/db';
import { generateId } from 'lucia';

import type { APIContext } from 'astro';
import type { DatabaseUser } from '../../../../lib/db';

export async function GET(context: APIContext): Promise<Response> {
  const code = context.url.searchParams.get('code');
  const state = context.url.searchParams.get('state');
  const storedState = context.cookies.get('auth0_oauth_state')?.value ?? null;
  if (!code || !state || !storedState || state !== storedState) {
    return new Response(null, {
      status: 400,
    });
  }

  try {
    const tokens = await auth0.validateAuthorizationCode(code);

    const response = await fetch(`${import.meta.env.AUTH0_DOMAIN}/userinfo`, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    });
    const user: Auth0User = await response.json();

    const existingUser = db
      .prepare('SELECT * FROM user WHERE email = ?')
      .get(user.email) as DatabaseUser | undefined;

    if (existingUser) {
      const session = await lucia.createSession(existingUser.id, {});
      const sessionCookie = lucia.createSessionCookie(session.id);
      context.cookies.set(
        sessionCookie.name,
        sessionCookie.value,
        sessionCookie.attributes
      );
      return context.redirect('/');
    }

    const userId = generateId(15);
    db.prepare('INSERT INTO user (id, email, username) VALUES (?, ?, ?)').run(
      userId,
      user.email,
      user.nickname || user.name
    );
    const session = await lucia.createSession(userId, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    context.cookies.set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes
    );
    return context.redirect('/');
  } catch (e) {
    console.log(e);
    if (
      e instanceof OAuth2RequestError &&
      e.message === 'bad_verification_code'
    ) {
      // invalid code
      return new Response(null, {
        status: 400,
      });
    }
    return new Response(null, {
      status: 500,
    });
  }
}

interface Auth0User {
  sub: string;
  nickname: string;
  name: string;
  picture: string;
  updated_at: string;
  email: string;
  email_verified: false;
}
