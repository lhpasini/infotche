'use server';

import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export async function getUsuarios() {
  try {
    return await prisma.usuario.findMany({ orderBy: { nome: 'asc' } });
  } catch (error) {
    console.error("Erro ao buscar usuarios:", error);
    return [];
  }
}

export async function upsertUsuario(id: string | null, data: { nome: string, login: string, senha?: string, role: string }) {
  try {
    if (id) {
      // Atualizar
      const updateData: any = { nome: data.nome, role: data.role };
      if (data.login !== 'admin') updateData.login = data.login; // Protege o login do admin mestre
      if (data.senha && data.senha.trim() !== '') updateData.senha = data.senha; // Só troca a senha se digitar uma nova

      await prisma.usuario.update({ where: { id }, data: updateData });
    } else {
      // Criar Novo
      await prisma.usuario.create({
        data: { nome: data.nome, login: data.login, senha: data.senha!, role: data.role }
      });
    }
    revalidatePath('/admin');
    return { sucesso: true };
  } catch (error) {
    console.error("Erro ao salvar usuario:", error);
    return { sucesso: false };
  }
}

export async function deleteUsuario(id: string) {
  try {
    const user = await prisma.usuario.findUnique({ where: { id }});
    if (user?.login === 'admin') return { sucesso: false, erro: 'Admin mestre não pode ser apagado.' };

    await prisma.usuario.delete({ where: { id } });
    revalidatePath('/admin');
    return { sucesso: true };
  } catch (error) {
    console.error("Erro ao deletar usuario:", error);
    return { sucesso: false };
  }
}
export async function atualizarMeuPerfil(id: string, nome: string, senha?: string) {
  try {
    const updateData: any = { nome };
    if (senha && senha.trim() !== '') updateData.senha = senha;
    
    await prisma.usuario.update({ where: { id }, data: updateData });

    // Atualiza o "Crachá" para o nome novo aparecer na hora
    const cookieStore = await cookies();
    const auth = cookieStore.get('auth_infotche');
    if (auth) {
      const sessao = JSON.parse(auth.value);
      sessao.nome = nome;
      cookieStore.set('auth_infotche', JSON.stringify(sessao), {
        httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 7, path: '/'
      });
    }

    revalidatePath('/admin');
    return { sucesso: true };
  } catch (error) {
    console.error("Erro ao atualizar perfil:", error);
    return { sucesso: false };
  }
}