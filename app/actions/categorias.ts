'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// Buscar todas as categorias
export async function getCategorias() {
  try {
    return await prisma.categoria.findMany({
      orderBy: { nome: 'asc' },
    });
  } catch (error) {
    console.error("Erro ao buscar categorias:", error);
    return [];
  }
}

// Criar ou Editar Categoria
export async function upsertCategoria(id: string | null, nome: string) {
  try {
    if (id) {
      await prisma.categoria.update({
        where: { id },
        data: { nome },
      });
    } else {
      await prisma.categoria.create({
        data: { nome },
      });
    }
    revalidatePath('/admin');
  } catch (error) {
    console.error("Erro ao salvar categoria:", error);
  }
}

// Excluir Categoria
export async function deleteCategoria(id: string) {
  try {
    await prisma.categoria.delete({
      where: { id },
    });
    revalidatePath('/admin');
  } catch (error) {
    console.error("Erro ao excluir categoria:", error);
  }
}