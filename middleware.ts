import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 1. Pega o "crachá" que geramos lá no auth.ts
  const authCookie = request.cookies.get('auth_infotche');

  // 2. Se a pessoa tentar entrar em qualquer página que comece com /admin...
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // ...e não tiver o crachá, é expulsa para a tela de login!
    if (!authCookie) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // 3. Regra Bônus: Se a pessoa acessar só o domínio puro (ex: seusite.com.br/)
  if (request.nextUrl.pathname === '/') {
    // Se já estiver logada, joga pro painel. Se não, joga pro login.
    if (authCookie) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Se estiver tudo certo, deixa passar.
  return NextResponse.next();
}

// 4. Configuração: Define em quais rotas o segurança vai trabalhar
export const config = {
  matcher: [
    '/admin/:path*', // Protege o admin e todas as subpáginas dele
    '/'              // Fica de olho na página inicial
  ],
};