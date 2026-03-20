import { cookies } from 'next/headers';

export type AuthSession = {
  id: string;
  nome: string;
  role: string;
};

const COOKIE_NAME = 'auth_infotche';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 60 * 60 * 24 * 7,
  path: '/',
};

export async function getAuthSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const auth = cookieStore.get(COOKIE_NAME);

  if (!auth?.value) {
    return null;
  }

  try {
    return JSON.parse(auth.value) as AuthSession;
  } catch {
    return null;
  }
}

export async function setAuthSession(session: AuthSession) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, JSON.stringify(session), COOKIE_OPTIONS);
}

export async function clearAuthSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
