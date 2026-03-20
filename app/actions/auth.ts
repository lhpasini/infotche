'use server';

import { prisma } from '../../lib/prisma';
import { clearAuthSession, getAuthSession, setAuthSession } from '../../lib/auth-session';

export async function fazerLogin(loginStr: string, senhaStr: string) {
  try {
    // 1. Truque mágico: se não tiver NENHUM usuário no banco, ele cria o seu primeiro acesso
    const totalUsuarios = await prisma.usuario.count();
    if (totalUsuarios === 0) {
      await prisma.usuario.create({
        data: { nome: 'Administrador', login: 'admin', senha: '123', role: 'ADMIN' }
      });
    }

    // 2. Busca quem está tentando logar
    const user = await prisma.usuario.findUnique({ where: { login: loginStr } });
    
    if (!user || user.senha !== senhaStr) {
      return { sucesso: false, erro: 'Usuário ou senha incorretos!' };
    }

    // 3. Cria o "Crachá" (Cookie) de autorização
    await setAuthSession({ id: user.id, nome: user.nome, role: user.role });

    return { sucesso: true };
  } catch (error) {
    console.error('Erro no login:', error);
    return { sucesso: false, erro: 'Erro interno no servidor.' };
  }
}
export async function fazerLogout() {
  await clearAuthSession();
  return { sucesso: true };
}
export async function getSessao() {
  return getAuthSession();
}
