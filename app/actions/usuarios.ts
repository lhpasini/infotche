'use server';

import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';
import { getAuthSession, setAuthSession } from '../../lib/auth-session';

function normalizarLogin(login: string) {
  return login.trim().toLowerCase();
}

function normalizarNome(nome: string) {
  return nome.trim().replace(/\s+/g, ' ');
}

export async function getUsuarios() {
  try {
    return await prisma.usuario.findMany({
      orderBy: [{ ativo: 'desc' }, { nome: 'asc' }],
    });
  } catch (error) {
    console.error('Erro ao buscar usuarios:', error);
    return [];
  }
}

export async function upsertUsuario(
  id: string | null,
  data: { nome: string; login: string; senha?: string; role: string; ativo?: boolean }
) {
  try {
    const nome = normalizarNome(data.nome);
    const login = normalizarLogin(data.login);
    const role = data.role === 'ADMIN' ? 'ADMIN' : 'TECNICO';
    const senha = data.senha?.trim() || '';
    const ativo = data.ativo ?? true;

    if (!nome) return { sucesso: false, erro: 'Informe o nome do usuário.' };
    if (!login) return { sucesso: false, erro: 'Informe o login de acesso.' };
    if (!id && senha.length < 4) return { sucesso: false, erro: 'A senha inicial deve ter pelo menos 4 caracteres.' };
    if (id && senha && senha.length < 4) return { sucesso: false, erro: 'A nova senha deve ter pelo menos 4 caracteres.' };

    const loginExistente = await prisma.usuario.findUnique({ where: { login } });
    if (loginExistente && loginExistente.id !== id) {
      return { sucesso: false, erro: 'Já existe um usuário com este login.' };
    }

    if (id) {
      const usuarioAtual = await prisma.usuario.findUnique({ where: { id } });
      if (!usuarioAtual) return { sucesso: false, erro: 'Usuário não encontrado.' };

      const updateData: {
        nome: string;
        role: string;
        ativo: boolean;
        login?: string;
        senha?: string;
      } = {
        nome,
        role: usuarioAtual.login === 'admin' ? 'ADMIN' : role,
        ativo: usuarioAtual.login === 'admin' ? true : ativo,
      };

      if (usuarioAtual.login !== 'admin') updateData.login = login;
      if (senha) updateData.senha = senha;

      await prisma.usuario.update({ where: { id }, data: updateData });
    } else {
      await prisma.usuario.create({
        data: { nome, login, senha, role, ativo }
      });
    }

    revalidatePath('/admin');
    return { sucesso: true };
  } catch (error) {
    console.error('Erro ao salvar usuario:', error);
    return { sucesso: false, erro: 'Não foi possível salvar o usuário.' };
  }
}

export async function toggleUsuarioAtivo(id: string) {
  try {
    const user = await prisma.usuario.findUnique({ where: { id } });
    if (!user) return { sucesso: false, erro: 'Usuário não encontrado.' };
    if (user.login === 'admin') return { sucesso: false, erro: 'O admin mestre deve permanecer ativo.' };

    await prisma.usuario.update({
      where: { id },
      data: { ativo: !user.ativo },
    });

    revalidatePath('/admin');
    return { sucesso: true };
  } catch (error) {
    console.error('Erro ao alternar status do usuario:', error);
    return { sucesso: false, erro: 'Não foi possível alterar o status do usuário.' };
  }
}

export async function deleteUsuario(id: string) {
  try {
    const user = await prisma.usuario.findUnique({ where: { id } });
    if (user?.login === 'admin') return { sucesso: false, erro: 'Admin mestre não pode ser apagado.' };

    await prisma.usuario.delete({ where: { id } });
    revalidatePath('/admin');
    return { sucesso: true };
  } catch (error) {
    console.error('Erro ao deletar usuario:', error);
    return { sucesso: false, erro: 'Não foi possível apagar o usuário.' };
  }
}

export async function atualizarMeuPerfil(id: string, nome: string, senha?: string) {
  try {
    const nomeNormalizado = normalizarNome(nome);
    if (!nomeNormalizado) return { sucesso: false, erro: 'Informe seu nome.' };

    const senhaNormalizada = senha?.trim() || '';
    if (senhaNormalizada && senhaNormalizada.length < 4) {
      return { sucesso: false, erro: 'A nova senha deve ter pelo menos 4 caracteres.' };
    }

    const updateData: { nome: string; senha?: string } = { nome: nomeNormalizado };
    if (senhaNormalizada) updateData.senha = senhaNormalizada;

    await prisma.usuario.update({ where: { id }, data: updateData });

    const auth = await getAuthSession();
    if (auth) {
      const sessao = { ...auth, nome: nomeNormalizado };
      await setAuthSession(sessao);
    }

    revalidatePath('/admin');
    return { sucesso: true };
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    return { sucesso: false, erro: 'Não foi possível atualizar seu perfil.' };
  }
}
