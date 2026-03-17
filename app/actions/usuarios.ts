'use server';

import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';

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