'use server';

import { prisma } from '../../lib/prisma';
import { clearAuthSession, getAuthSession, setAuthSession } from '../../lib/auth-session';

function normalizarLogin(login: string) {
  return login.trim().toLowerCase();
}

export async function fazerLogin(loginStr: string, senhaStr: string) {
  try {
    const totalUsuarios = await prisma.usuario.count();
    if (totalUsuarios === 0) {
      await prisma.usuario.create({
        data: { nome: 'Administrador', login: 'admin', senha: '123', role: 'ADMIN', ativo: true }
      });
    }

    const loginNormalizado = normalizarLogin(loginStr);
    const user = await prisma.usuario.findUnique({ where: { login: loginNormalizado } });

    if (!user || user.senha !== senhaStr) {
      return { sucesso: false, erro: 'Usuário ou senha incorretos!' };
    }

    if (!user.ativo) {
      return { sucesso: false, erro: 'Este usuário está inativo. Procure um administrador.' };
    }

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
