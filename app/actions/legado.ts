'use server';

import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';

export async function importarHistoricoLegado(linhas: any[]) {
  try {
    await prisma.historicoLegado.createMany({
      data: linhas,
      skipDuplicates: true,
    });
    revalidatePath('/admin');
    return { sucesso: true };
  } catch (error) {
    console.error("Erro ao importar legado:", error);
    return { sucesso: false, erro: "Falha na importação" };
  }
}

export async function getUltimosLegado(limite: number | 'todos') {
  try {
    return await prisma.historicoLegado.findMany({
      take: limite === 'todos' ? undefined : limite,
      orderBy: { criadoEm: 'desc' }
    });
  } catch (error) {
    console.error("Erro ao buscar ultimos do legado:", error);
    return [];
  }
}

export async function buscarHistoricoLegado(termo: string) {
  if (!termo || termo.length < 3) return [];
  try {
    return await prisma.historicoLegado.findMany({
      where: {
        OR: [
          { cliente_nome: { contains: termo, mode: 'insensitive' } },
          { detalhes_brutos: { contains: termo, mode: 'insensitive' } }
        ]
      },
      take: 500,
      orderBy: { criadoEm: 'desc' }
    });
  } catch (error) {
    console.error("Erro ao buscar legado:", error);
    return [];
  }
}

// NOVA FUNÇÃO: Limpar a tabela inteira para reimportar
export async function limparHistoricoLegado() {
  try {
    await prisma.historicoLegado.deleteMany({});
    revalidatePath('/admin');
    return { sucesso: true };
  } catch (error) {
    console.error("Erro ao limpar legado:", error);
    return { sucesso: false };
  }
}