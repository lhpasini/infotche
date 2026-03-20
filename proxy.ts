import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const authCookie = request.cookies.get('auth_infotche');
  const pathname = request.nextUrl.pathname;
  const isTecnicoLogin = pathname === '/tecnico/login';

  if (pathname.startsWith('/admin') && !authCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (pathname.startsWith('/tecnico')) {
    if (!authCookie && !isTecnicoLogin) {
      return NextResponse.redirect(new URL('/tecnico/login', request.url));
    }

    if (authCookie && isTecnicoLogin) {
      return NextResponse.redirect(new URL('/tecnico', request.url));
    }
  }

  if (pathname === '/') {
    if (authCookie) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }

    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/tecnico/:path*',
    '/',
  ],
};
