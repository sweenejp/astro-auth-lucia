import { Lucia } from 'lucia';
import { BetterSqlite3Adapter } from '@lucia-auth/adapter-sqlite';
import { db } from './db';
import { Auth0 } from 'arctic';

import type { DatabaseUser } from './db';

const adapter = new BetterSqlite3Adapter(db, {
  user: 'user',
  session: 'session',
});

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: import.meta.env.PROD,
    },
  },
  getUserAttributes: attributes => {
    return {
      username: attributes.username,
      email: attributes.email,
    };
  },
});

declare module 'lucia' {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: Omit<DatabaseUser, 'id'>;
  }
}

const appUrl = import.meta.env.APP_URL;

export const auth0 = new Auth0(
  import.meta.env.AUTH0_DOMAIN,
  import.meta.env.AUTH0_CLIENT_ID,
  import.meta.env.AUTH0_CLIENT_SECRET,
  `${appUrl}/api/login/auth0/callback`
);
